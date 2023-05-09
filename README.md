# FullStack-ChatGPT-WebApp

[![GitHub license](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f6c6963656e73652d4d49542d626c7565.svg)](https://github.com/frontend-engineering/chatgpt-webapp-fullstack)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/express)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/WeixinCloud/wxcloudrun-express/sequelize)


这是一个 ChatGPT 聊天应用，包含网页端App和一个Node服务，可快速部署一套自用的完整智能聊天服务（[点击体验](https://chat.webinfra.cloud)）

经过线上检验完全可以成为学习、工作和生活中的小帮手，适合感兴趣的同学自用。

后台目前接入的服务默认是ChatGPT，也同时兼容BingAI或者其他国内模型，只需Node服务配置下环境变量即可。

<p align="center">
    <video width="248px" src="https://user-images.githubusercontent.com/9939767/224280622-811fe048-8f39-469b-a199-53b32098b100.mov" controls autoplay />
</p>

## 项目体验

在微信中打开 [DEMO](https://chat.webinfra.cloud)
或扫码
<p align="center">
  <img alt="demo qr" width="128px" src="./public/assets/qr.jpg">
</p>

## 项目结构说明

```
├── client
├── node-api
├── Dockerfile
├── README.md
├── assets
├── LICENSE
```

- `client`：前端代码，一个独立的 React 项目
- `node-api`：服务端代码，nodejs 启动的 server，整合前端数据和对话上下文，调用 ChatGPT 的API
- `README.md`：项目文档
- `Dockerfile`：容器配置文件
- `assets`：静态资源目录
- `LICENSE`：LICENSE 说明


>> 服务端项目fork自 [upstream](https://github.com/waylaidwanderer/node-chatgpt-api) 项目，该项目最开始用做调用OpenAI内部训练的免费模型，不过稳定性不好，维护成本较高，目前不推荐了。
也保留了该项目的README文件用做参考或者直接去原项目查看详情。


## 快速开始

### 启动服务端

服务端代码在 `node-api` 目录中，是个标准的 nodejs 项目

进入目录中，先安装依赖：
```javascript
npm install
```

启动项目
```javascript
npm run start
```

注意：项目启动时**唯一**需要配置的是 OpenAI 账户的 ApiKey，可以通过命令行中直接配置环境变量 `OPENAI_API_KEY`，在生成环境，建议通过 `settings.js` 来配置。

另外，如需同时配置多个ApiKey，只需要将多个key中间用 `","` 隔开即可，注意中英文切换，例如
```
OPENAI_API_KEY=sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc,sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc,sk-Ek6f5n*q7X*8I2mgH****T***F**I97ON**y*BzUpc
```

![settings.js](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/WeChatWorkScreenshot_1f621a72-0215-4b7c-8788-691042134155.png)


![项目启动](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/WeChatWorkScreenshot_bdb8b38d-fbfe-4333-842d-144d9c8fe3f0.png)

### 启动前端页面

前端页面代码在目录 `client` 中，是个简单的CRA项目

进入目录中，先安装依赖：
```javascript
npm install
```

然后，启动项目

```javascript
npm run start
```

即可开始愉快地聊天啦～

![](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/IMG_0101.PNG)

## 更多功能
更多功能正在开发中，如有需要可以私聊，或者贡献PR

* 预设常用场景的prompt
* 用户登录
* 流量控制
* 前端聊天界面 Prompt 预设选项
* 微信分享
* 其他

## 私有部署
如有部署方面的问题，可关注公众号 <strong>webinfra</strong> 需求帮助
 ![](https://flashpixel-1253674045.cos.ap-shanghai.myqcloud.com/%E6%89%AB%E7%A0%81_%E6%90%9C%E7%B4%A2%E8%81%94%E5%90%88%E4%BC%A0%E6%92%AD%E6%A0%B7%E5%BC%8F-%E7%99%BD%E8%89%B2%E7%89%88.bmp)

 或加交流群
 <p align="center">
    <img width="248px" src="/public/assets/group-qr-5-16.jpeg" />
  </p>

## License

[MIT](./LICENSE)
