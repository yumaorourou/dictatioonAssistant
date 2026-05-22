export default defineAppConfig({
  pages: [
    'pages/index/index',
  ],
  subPackages: [
    {
      root: 'pages/result',
      pages: [
        'index',
      ],
    },
    {
      root: 'pages/dictation',
      pages: [
        'index',
      ],
    },
  ],

  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '听写助手',
    navigationBarTextStyle: 'white',
  },
  permission: {
    'scope.camera': {
      desc: '用于拍摄生字页面进行识别',
    },
    'scope.writePhotosAlbum': {
      desc: '用于保存识别图片',
    },
  },
})
