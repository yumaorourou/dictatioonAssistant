const fs = require('fs')
const path = require('path')
const ci = require('miniprogram-ci')
const { prompt, AutoComplete } = require('enquirer')

const ROOT = path.resolve(__dirname, '../..')

const pushTypeOptions = ['init', 'feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test']

function getFolderSize(dir) {
  let size = 0
  function walk(current) {
    const files = fs.readdirSync(current)
    for (const file of files) {
      const filePath = path.join(current, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        walk(filePath)
      } else {
        size += stat.size
      }
    }
  }
  walk(dir)
  return size
}

/**
 * @param {{ name?: string, message?: string, choices?: string[] }} data
 */
async function generateStep(data = {}) {
  const { choices } = data
  if (choices && choices.length > 1) {
    const customPrompt = new AutoComplete(data)
    return customPrompt.run()
  }
  if (choices && choices.length === 1) {
    return choices[0]
  }
  return ''
}

; (async () => {
  try {

    const config = {
      appid: 'wxc402bf2c70d8d0be',
      privateKeyPath: path.join(ROOT, 'private.wxc402bf2c70d8d0be.key'),
    }

    if (!fs.existsSync(config.privateKeyPath)) {
      console.error(
        `私钥文件不存在: ${config.privateKeyPath}\n请从微信公众平台下载「代码上传」密钥并保存为上述文件名。`,
      )
      process.exit(1)
    }

    const projectPath = path.join(ROOT, 'dist')
    if (!fs.existsSync(projectPath)) {
      console.error(
        `构建目录不存在: ${projectPath}\n请先执行: pnpm real:weapp（或 pnpm dev:weapp）生成微信小程序产物后再上传。`,
      )
      process.exit(1)
    }

    const project = new ci.Project({
      appid: config.appid,
      type: 'miniProgram',
      projectPath,
      privateKeyPath: config.privateKeyPath,
      ignores: ['node_modules/**/*', 'key/**/*', 'keys/**/*'],
    })

    let desc = ''
    const pushTypeAnswer = await generateStep({
      name: 'pushType',
      message: '请选择提交类型?',
      choices: pushTypeOptions,
    })
    desc += `${pushTypeAnswer}：`

    const versionRes = await prompt({
      type: 'input',
      name: 'version',
      message: '请输入版本号?',
    })
    const version = String(versionRes.version || '').trim()
    if (!version) {
      console.error('版本号不能为空')
      process.exit(1)
    }

    const response = await prompt({
      type: 'input',
      name: 'des',
      message: '请输入版本描述?',
    })
    desc += response.des || ''



    const uploadRes = await ci.upload({
      project,
      version,
      desc,
      setting: {
        es6: true,
        es7: true,
        minifyJS: true,
        minifyWXML: true,
        minifyWXSS: true,
        minify: true,
        codeProtect: true,
        ignoreUploadUnusedFiles: true,
      },
      onProgressUpdate: console.log,
    })

    console.log('上传成功', uploadRes)
    process.exit(0)
  } catch (err) {
    console.error('上传失败', err)
    process.exit(1)
  }
})()
