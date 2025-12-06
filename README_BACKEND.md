# SumVid 後端服務

後端服務用於保護 GROQ API key，避免在前端程式碼中暴露。

## 安裝

```bash
npm install
```

## 設定環境變數

複製 `.env.example` 為 `.env` 並填入您的 API key：

```bash
cp .env.example .env
```

編輯 `.env` 檔案：
```
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

## 啟動服務

開發模式（自動重啟）：
```bash
npm run dev
```

生產模式：
```bash
npm start
```

服務將運行在 `http://localhost:3000`

## API 端點

### POST /api/generate-summary

生成影片重點摘要

**請求體：**
```json
{
  "videoData": {
    "title": "影片標題",
    "description": "影片描述",
    "transcript": "影片字幕",
    "transcriptSegments": []
  },
  "langConfig": {
    "systemMessage": "...",
    "singlePrompt": "...",
    "chunkPrompt": "...",
    "finalPrompt": "...",
    "isEnglish": false
  }
}
```

**回應：**
```json
{
  "success": true,
  "summary": "生成的重點摘要..."
}
```

### GET /health

健康檢查端點

**回應：**
```json
{
  "status": "ok",
  "service": "SumVid API"
}
```

## 部署

### 本地開發
- 確保後端服務運行在 `http://localhost:3000`
- 擴充功能會自動連接到本地服務

### 生產環境
1. 將後端服務部署到您的伺服器（如 Heroku、Vercel、AWS 等）
2. 更新 `background.js` 中的 `BACKEND_API_URL` 為您的服務網址
3. 確保環境變數 `GROQ_API_KEY` 已設定

## 安全注意事項

- 永遠不要將 `.env` 檔案提交到版本控制
- 使用環境變數管理 API key
- 考慮加入 API 限流和認證機制
- 監控 API 使用量

