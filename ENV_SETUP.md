# 環境變數設定說明

## 建立 .env 檔案

在專案根目錄建立 `.env` 檔案，內容如下：

```
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

## 注意事項

- `.env` 檔案已加入 `.gitignore`，不會被提交到版本控制
- 請勿將包含真實 API key 的 `.env` 檔案分享給他人
- 生產環境請使用環境變數管理服務（如 Heroku Config Vars、AWS Secrets Manager 等）

