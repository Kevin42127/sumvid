# Vercel 部署指南

## 部署步驟

### 1. 準備專案

確保專案包含以下檔案：
- `api/generate-summary.js` - 主要 API 端點
- `api/health.js` - 健康檢查端點
- `vercel.json` - Vercel 配置
- `package.json` - 專案依賴

### 2. 安裝 Vercel CLI（可選）

```bash
npm i -g vercel
```

### 3. 部署到 Vercel

#### 方法一：使用 Vercel CLI

```bash
# 登入 Vercel
vercel login

# 部署
vercel

# 生產環境部署
vercel --prod
```

#### 方法二：使用 GitHub 整合

1. 將專案推送到 GitHub
2. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
3. 點擊 "Add New Project"
4. 選擇您的 GitHub 儲存庫
5. 設定環境變數（見下方）
6. 點擊 "Deploy"

### 4. 設定環境變數

在 Vercel Dashboard 中：

1. 進入專案設定
2. 前往 "Environment Variables"
3. 新增環境變數：
   - **Name**: `GROQ_API_KEY`
   - **Value**: 您的 GROQ API key
   - **Environment**: Production, Preview, Development（全部勾選）

### 5. 更新擴充功能配置

部署完成後，Vercel 會提供一個網址，例如：
```
https://your-project.vercel.app
```

更新 `background.js` 中的 `BACKEND_API_URL`：

```javascript
const BACKEND_API_URL = 'https://your-project.vercel.app/api';
```

**重要**：將 `your-project.vercel.app` 替換為您實際的 Vercel 專案網址。

### 6. 測試部署

訪問健康檢查端點：
```
https://your-project.vercel.app/api/health
```

應該會看到：
```json
{
  "status": "ok",
  "service": "SumVid API"
}
```

## API 端點

部署後的 API 端點：

- **生成重點**: `POST https://your-project.vercel.app/api/generate-summary`
- **健康檢查**: `GET https://your-project.vercel.app/api/health`

## 注意事項

1. **執行時間限制**: Vercel 免費方案有 10 秒執行時間限制，Pro 方案有 60 秒
2. **環境變數**: 確保在 Vercel Dashboard 中正確設定 `GROQ_API_KEY`
3. **CORS**: API 已設定 CORS，允許從擴充功能呼叫
4. **冷啟動**: 首次請求可能較慢（冷啟動），後續請求會更快

## 故障排除

### 問題：API 返回 500 錯誤

- 檢查環境變數是否正確設定
- 查看 Vercel 的 Function Logs

### 問題：執行超時

- 考慮升級到 Pro 方案（60 秒限制）
- 或優化分段分析邏輯

### 問題：CORS 錯誤

- 確認 `api/generate-summary.js` 中有設定 CORS
- 檢查擴充功能的 `manifest.json` 權限設定

