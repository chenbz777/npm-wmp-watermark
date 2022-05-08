// components/Watermark/index.js
Component({
  /**
     * 组件的属性列表
     */
  properties: {
    // 图片url
    imageUrl: {
      type: String,
      value: 'https://s1.ax1x.com/2022/05/08/OlbiFI.gif'
    },
    // "加载中"图片url
    lazyImageUrl: {
      type: String,
      value: 'https://s1.ax1x.com/2022/05/08/OlbiFI.gif'
    },
    // 水印文字
    content: {
      type: String,
      value: '请勿外传,盗版必究'
    },
    // 水印字体颜色
    contentColor: {
      type: String,
      value: 'rgba(255,255,255,.5)'
    },
    // 水印字体大小
    contentSize: {
      type: Number,
      value: 15
    },
    // 水印水平间距
    level: {
      type: Number,
      value: 60
    },
    // 水印垂直间距
    vertical: {
      type: Number,
      value: 150
    },
    // 懒加载
    lazy: {
      type: Boolean,
      value: true
    },
  },

  /**
     * 组件的初始数据
     */
  data: {
    imageId: '',
    canvasId: '',
    canvasWidth: '300',
    canvasHeight: '300',
    imageInfo: {},
    isLoading: true,
    canvasImage: '',
    canvas: {}
  },

  lifetimes: {
    // 在组件在视图层布局完成后执行
    async ready() {
      // 生成唯一 canvasId
      const canvasId = 'canvas' + Date.now()
      // 生成唯一 imageId
      const imageId = 'image' + Date.now()

      this.setData({
        canvasId,
        imageId
      })

      if (this.data.lazy) {
        // 开启懒加载
        this.lazy('.' + imageId)
      } else {
        await this.createCanvas()
      }
    }
  },

  /**
     * 组件的方法列表
     */
  methods: {

    // 创建canvas
    async createCanvas() {
      // 获取图片信息,根据图片信息动态修改canvas宽度和高度
      const imageInfo = await this.getImageInfo(this.data.imageUrl)

      const imageDom = await this.selectorQuery('.' + this.data.imageId)

      const width = imageDom.width
      const heightScale = imageInfo.height / imageInfo.width
      const height = width * heightScale

      this.setData({
        canvasWidth: width,
        canvasHeight: height,
        imageInfo,
      })

      // // 开始生成
      this.initCanvas()

      // 关闭加载中图片
      this.setData({
        isLoading: false
      })
    },

    // 获取节点
    selectorQuery(select) {
      return new Promise((resolve) => {
        const query = wx.createSelectorQuery().in(this)
        query.select(select)
          .fields({
            node: true,
            size: true
          })
          .exec((res) => {
            if (res.length) {
              resolve(res[0])
            }
          })
      })
    },

    // 初始化canvas
    async initCanvas() {
      const canvasDom = await this.selectorQuery('.' + this.data.canvasId)

      const canvas = canvasDom.node

      this.setData({
        canvas
      })

      let ctx = canvas.getContext('2d')

      const {
        canvasWidth,
        canvasHeight,
        imageInfo,
        content
      } = this.data

      // const dpr = wx.getSystemInfoSync().pixelRatio;
      // 生成4倍图 => 高清
      const dpr = 4
      canvas.width = canvasWidth * dpr
      canvas.height = canvasHeight * dpr
      ctx.scale(dpr, dpr)

      // 设置水印颜色
      ctx.fillStyle = this.data.contentColor
      // 设置水印文字大小和字体
      ctx.font = `${this.data.contentSize}px sans-serif`

      ctx = await this.createCanvasImage({
        canvas,
        ctx,
        imageInfo,
        content
      })

      return canvas
    },

    // 获取图片信息
    getImageInfo(url) {
      return new Promise((resolve) => {
        wx.getImageInfo({
          src: url,
          success(res) {
            resolve(res)
          }
        })
      })
    },

    // 创建canvas图片
    createCanvasImage(data) {
      const {
        canvas,
        ctx,
        imageInfo,
        content,
      } = data
      return new Promise((resolve) => {
        const newCanvasImage = canvas.createImage()
        newCanvasImage.src = imageInfo.path
        newCanvasImage.onload = () => {
          const {
            canvasWidth,
            canvasHeight
          } = this.data

          // 生成图片
          ctx.drawImage(newCanvasImage, 0, 0, canvasWidth, canvasHeight)

          // 保存当前状态
          ctx.save()

          // 旋转参考点
          ctx.translate((0 - (canvasWidth / 2)), canvasHeight / 2)
          // 旋转角度 -45
          ctx.rotate(-45 * Math.PI / 180)

          // 水印文字宽度
          const textWidth = ctx.measureText(content).width
          // 计算水平循环次数
          const levelNum = Math.ceil(canvasWidth / textWidth)
          // 计算垂直循环次数
          const verticalNum = Math.ceil(canvasHeight / this.data.vertical)

          // 循环添加水印文字
          for (let i = 0; i < levelNum; i++) {
            const levelWidth = (textWidth * i) + (this.data.level * i)

            ctx.fillText(content, levelWidth, this.data.vertical)

            for (let j = 0; j < verticalNum; j++) {
              ctx.fillText(content, levelWidth, this.data.vertical * j)
            }
          }

          // 恢复之前保存的上下文
          ctx.restore()

          // 保存修改
          ctx.save()

          resolve(ctx)
        }
      })
    },

    // 懒加载
    lazy(className) {
      const IntersectionObserver = this.createIntersectionObserver()
      IntersectionObserver.relativeToViewport()
      IntersectionObserver.observe(className, async (res) => {
        if (res.intersectionRatio > 0) {
          await this.createCanvas()

          // 关闭监听
          IntersectionObserver.disconnect()
        }
      })
    },

    // 点击查看canvas合成图片
    previewCanvas() {
      const root = this
      if (!this.data.canvasImage) {
        wx.canvasToTempFilePath({
          canvas: this.data.canvas,
          success(res) {
            root.setData({
              canvasImage: res.tempFilePath
            })
            wx.previewImage({
              urls: [res.tempFilePath] // 需要预览的图片http链接列表
            })
          }
        })
      } else {
        wx.previewImage({
          urls: [this.data.canvasImage] // 需要预览的图片http链接列表
        })
      }
    }

  }
})
