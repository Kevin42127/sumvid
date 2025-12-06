# SumVid

SumVid - 讓 AI 為您快速提取影片重點

Chrome/Edge 瀏覽器擴充功能，自動分析 YouTube 影片內容並使用 GROQ AI 生成重點摘要。

## 功能特色

- 自動提取 YouTube 影片標題、描述和字幕
- 使用 GROQ AI 分析影片內容
- 生成結構化的重點摘要
- 一鍵複製重點內容
- 簡潔易用的介面

## 安裝方式

1. 下載或複製此專案到本地
2. 開啟 Chrome/Edge 瀏覽器
3. 前往 `chrome://extensions/` 或 `edge://extensions/`
4. 開啟「開發人員模式」
5. 點擊「載入未封裝項目」
6. 選擇專案資料夾

## 使用方法

1. 前往 YouTube 影片頁面
2. 點擊瀏覽器工具列中的擴充功能圖標
3. 點擊「生成重點」按鈕
4. 等待 AI 分析完成
5. 查看生成的重點摘要
6. 點擊複製按鈕可複製重點內容

## 技術架構

- Manifest V3
- Content Script 提取影片資訊
- Background Service Worker 處理 AI API 呼叫
- GROQ AI API 生成重點摘要

## 後端服務設定

本專案使用後端服務保護 API key。請先啟動後端服務：

1. 安裝依賴：
```bash
npm install
```

2. 建立 `.env` 檔案（參考 `ENV_SETUP.md`）：
```
GROQ_API_KEY=your_api_key_here
PORT=3000
```

3. 啟動後端服務：
```bash
npm start
```

後端服務將運行在 `http://localhost:3000`

詳細說明請參考 `README_BACKEND.md`

## 注意事項

- 需要在 YouTube 影片頁面使用
- 需要網路連線以呼叫 AI API
- 需要先啟動後端服務
- API key 存放在後端服務的環境變數中，不會暴露在前端

## 授權

版權所有 © SumVid

