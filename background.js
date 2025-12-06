const BACKEND_API_URL = 'https://sumvid.vercel.app/api';

function detectLanguage(text) {
  if (!text || text.length === 0) return 'zh';
  
  const chinesePattern = /[\u4e00-\u9fff]/;
  const englishPattern = /[a-zA-Z]/;
  
  let chineseCount = 0;
  let englishCount = 0;
  
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    if (chinesePattern.test(text[i])) chineseCount++;
    if (englishPattern.test(text[i])) englishCount++;
  }
  
  return chineseCount > englishCount ? 'zh' : 'en';
}

function getLanguageConfig(language) {
  if (language === 'en') {
    return {
      systemMessage: 'You are a professional video content analysis assistant, skilled at extracting video key points and presenting them clearly. You focus on core concepts, important arguments, key data, practical tips, and conclusion points. Please use plain text paragraph format to present key points, write in continuous paragraphs without bullet points, numbered lists, or other formatting.',
      chunkPrompt: (content, chunkIndex, totalChunks) => `Please analyze the following video content segment and extract key points. Key points should include:
1. Core theme and main concepts
2. Important arguments, steps, or processes
3. Key data, statistics, or facts
4. Practical tips, suggestions, or methods
5. Important concept explanations
6. Conclusion or summary points

Please use plain text paragraph format, write in continuous paragraphs without bullet points, numbered lists, or other formatting. Keep the content clear and well-organized:

${content}

Please generate key points for this segment:`,
      singlePrompt: (content) => `Please analyze the following video content and generate a structured key points summary. Key points should include:
1. Core theme and main concepts
2. Important arguments, steps, or processes
3. Key data, statistics, or facts
4. Practical tips, suggestions, or methods
5. Important concept explanations
6. Conclusion or summary points

Please use plain text paragraph format, write in continuous paragraphs without bullet points, numbered lists, or other formatting. Keep the content clear and well-organized:

${content}

Please generate video key points:`,
      finalPrompt: (combinedSummary) => `The following are key points extracted from different segments of the video. Please integrate and deduplicate them to generate a complete structured key points summary. Key points should include:
1. Core theme and main concepts
2. Important arguments, steps, or processes
3. Key data, statistics, or facts
4. Practical tips, suggestions, or methods
5. Important concept explanations
6. Conclusion or summary points

Please use plain text paragraph format, write in continuous paragraphs without bullet points, numbered lists, or other formatting. Organize the content in logical order and keep it clear:

${combinedSummary}

Please generate the complete video key points summary:`,
      progressText: {
        analyzing: 'Analyzing video content...',
        analyzingChunk: (current, total) => `Analyzing segment ${current}/${total}...`,
        integrating: 'Integrating all key points...'
      }
    };
  } else {
    return {
      systemMessage: '你是一個專業的影片內容分析助手，擅長提取影片重點並以清晰的方式呈現。你會關注核心概念、重要論點、關鍵數據、實用技巧和結論要點。請使用純文字段落格式呈現重點，以連續段落的方式書寫，不要使用項目符號、編號列表或其他格式。',
      chunkPrompt: (content, chunkIndex, totalChunks) => `請分析以下影片內容片段，提取關鍵重點。重點應包含：
1. 核心主題與主要概念
2. 重要論點、步驟或流程
3. 關鍵數據、統計或事實
4. 實用技巧、建議或方法
5. 重要概念解釋
6. 結論或總結要點

請使用純文字段落格式，以連續段落的方式書寫，不要使用項目符號、編號列表或其他格式。保持內容清晰有條理：

${content}

請生成此片段的重點：`,
      singlePrompt: (content) => `請分析以下影片內容，並生成結構化的重點摘要。重點應包含：
1. 核心主題與主要概念
2. 重要論點、步驟或流程
3. 關鍵數據、統計或事實
4. 實用技巧、建議或方法
5. 重要概念解釋
6. 結論或總結要點

請使用純文字段落格式，以連續段落的方式書寫，不要使用項目符號、編號列表或其他格式。保持內容清晰有條理：

${content}

請生成影片重點：`,
      finalPrompt: (combinedSummary) => `以下是從影片不同段落提取的重點，請整合並去重，生成一份完整的結構化重點摘要。重點應包含：
1. 核心主題與主要概念
2. 重要論點、步驟或流程
3. 關鍵數據、統計或事實
4. 實用技巧、建議或方法
5. 重要概念解釋
6. 結論或總結要點

請使用純文字段落格式，以連續段落的方式書寫，不要使用項目符號、編號列表或其他格式。按邏輯順序組織內容，保持清晰有條理：

${combinedSummary}

請生成完整的影片重點摘要：`,
      progressText: {
        analyzing: '正在分析影片內容...',
        analyzingChunk: (current, total) => `正在分析第 ${current}/${total} 段內容...`,
        integrating: '正在整合所有重點...'
      }
    };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSummary') {
    let progressCallback = null;
    if (sender.tab) {
      progressCallback = (progress) => {
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          progress: progress
        }).catch(() => {});
      };
    }
    
    generateSummary(request.data, progressCallback)
      .then(result => {
        console.log('Background: Sending response with rateLimitInfo:', result.rateLimitInfo); // 調試用
        console.log('Background: Full result object:', JSON.stringify(result, null, 2));
        
        // 確保 rateLimitInfo 存在
        if (!result.rateLimitInfo || result.rateLimitInfo.remaining === undefined) {
          console.warn('Background: Missing rateLimitInfo in result, creating default');
          result.rateLimitInfo = {
            remaining: 2,
            count: 1,
            limit: 3,
            windowSeconds: 60
          };
        }
        
        sendResponse({ 
          success: true, 
          summary: result.summary,
          rateLimitInfo: result.rateLimitInfo
        });
      })
      .catch(error => {
        const response = { success: false, error: error.message };
        
        // 如果是時間限制錯誤，傳遞額外資訊
        if (error.rateLimitReached) {
          response.rateLimitReached = true;
          response.waitTime = error.waitTime;
          response.count = error.count;
          response.limit = error.limit;
        }
        
        sendResponse(response);
      });
    return true;
  }
});



async function generateSummary(videoData, progressCallback) {
  const { title, description, transcript, transcriptSegments } = videoData;
  
  if (!transcript && !title && !description) {
    throw new Error('沒有可分析的內容');
  }

  const detectedLanguage = detectLanguage(title + ' ' + description + ' ' + transcript);
  const langConfig = getLanguageConfig(detectedLanguage);
  const isEnglish = detectedLanguage === 'en';

  if (progressCallback) {
    progressCallback({ current: 1, total: 1, text: langConfig.progressText.analyzing });
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/generate-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoData: {
          title,
          description,
          transcript,
          transcriptSegments
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 如果是時間限制錯誤，保留額外資訊
      if (response.status === 429 && errorData.rateLimitReached) {
        const error = new Error(errorData.error || '請求過於頻繁');
        error.rateLimitReached = true;
        error.waitTime = errorData.waitTime;
        error.count = errorData.count;
        error.limit = errorData.limit;
        throw error;
      }
      
      throw new Error(errorData.error || `後端服務錯誤：${response.status}`);
    }

    const data = await response.json();
    
    console.log('Background: API response data:', data); // 調試用
    console.log('Background: rateLimitInfo in response:', data.rateLimitInfo); // 調試用
    
    if (!data.success) {
      throw new Error(data.error || '生成重點時發生錯誤');
    }

    // 確保 rateLimitInfo 存在，如果沒有則創建默認值
    let rateLimitInfo = data.rateLimitInfo;
    if (!rateLimitInfo || rateLimitInfo.remaining === undefined) {
      console.warn('Background: No valid rateLimitInfo in response, creating default');
      console.warn('Background: Received data:', JSON.stringify(data, null, 2));
      rateLimitInfo = {
        remaining: 2, // 假設還有剩餘次數
        count: 1,
        limit: 3,
        windowSeconds: 60
      };
    }

    const result = {
      summary: data.summary,
      rateLimitInfo: rateLimitInfo
    };
    
    console.log('Background: Returning result:', JSON.stringify(result, null, 2)); // 調試用
    
    return result;
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(isEnglish ? '無法連接到後端服務，請確認服務是否運行' : '無法連接到後端服務，請確認服務是否運行');
    }
    throw error;
  }
}


