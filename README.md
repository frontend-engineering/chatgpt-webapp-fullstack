# FullStack-ChatGPT-WebApp

[![GitHub license](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c6963656e73652d4d49542d626c7565.svg)](https://github.com/frontend-engineering/chatgpt-webapp-fullstack)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/sequelize)


这是一个 ChatGPT 聊天应用，包含网页端App和一个Node服务，可快速部署一套自用的完整智能聊天服务（[点击体验](https://www.webinfra.cloud)）

## 功能特点

* 全栈应用：包括 **网页端App** 和 **服务端Node服务**，适合全链路功能的二次开发
* 快速部署：项目迁移到了Nextjs架构，前后端一键部署，无须一行代码，小白也可以发布自己的ChatGPT服务了
* 无须运维：利用vercel的免费额度，摆脱繁琐的运维工作
* 无须翻墙：针对国内无法直接访问OpenAI的限制，本服务部署完成后，可直接访问，无须科学上网
* 多端适配：适配手机端和PC端，更多客户端功能迭代中
* 上下文记忆：问了保障问答质量，缓存了提问记录
* stream响应：支持stream的响应方式，更好的问答体验
* 流量控制：支持单用户的调用流量限制，防止恶意盗刷Token
* 用户充值：支持开启用户收费功能，用户可充值购买调用额度

>> 功能开发快速迭代中，使用或部署时如果遇到任何问题，请加页面最下方微信交流群反馈

https://github.com/frontend-engineering/chatgpt-webapp-fullstack/assets/9939767/eaef68ce-e73b-4dd5-9277-6b0f4f201455



## 一键部署

自动部署服务到Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffrontend-engineering%2Fchatgpt-webapp-fullstack&project-name=private-chatgpt-service&repository-name=chatgpt-webapp-fullstack&demo-title=Demo%20Page&demo-description=%E7%A4%BA%E4%BE%8B%E9%A1%B9%E7%9B%AE&demo-url=https%3A%2F%2Fwebinfra.cloud)

### 部署依赖

需要额外配置vercel Edge Config 和 Vercel KV 两个store
* Edge Config 用来管理项目配置
* KV 用于存储用户聊天上下文的数据缓存

其中，Edge Config的初始配置可以参考
```
{
  "chatGptClient": {
    "openaiApiKey": "sk-你的openai api key",
    "reverseProxyUrl": "",
    "modelOptions": {
      "model": "gpt-3.5-turbo",
      "max_tokens": 1000
    },
    "proxy": "",
    "debug": false
  },
  "apiOptions": {
    "port": 3000,
    "host": "0.0.0.0",
    "debug": false,
    "clientToUse": "chatgpt",
    "perMessageClientOptionsWhitelist": {
      "validClientsToUse": ["bing", "chatgpt", "chatgpt-browser"],
      "chatgpt": [
        "promptPrefix",
        "userLabel",
        "chatGptLabel",
        "modelOptions.temperature"
      ]
    }
  },
  "cacheOptions": {}
}
```

## 项目结构

项目迁移到了NextJS，开发参考 [Next.js文档](https://nextjs.org/docs)

## 项目体验

打开 [DEMO](https://www.webinfra.cloud)
或扫码
<p align="center">
  <img alt="demo qr" width="128px" src="./public/assets/qr.jpg">
</p>



## 更多功能
更多功能正在开发中，如有需要可以私聊，或者贡献PR

* 前端WebApp功能补全
* BingAI等多模型支持
* 其他

## 私有部署
如有部署方面的问题，可关注公众号 <strong>webinfra</strong> 需求帮助
 ![](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/%E6%89%AB%E7%A0%81_%E6%90%9C%E7%B4%A2%E8%81%94%E5%90%88%E4%BC%A0%E6%92%AD%E6%A0%B7%E5%BC%8F-%E7%99%BD%E8%89%B2%E7%89%88.bmp)

 或加交流群
<p align="center">
  <img width="248px" src="/public/assets/group-qr-6-3.jpeg" />
</p>

## License

[MIT](./LICENSE)
