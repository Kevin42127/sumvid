const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.error('錯誤：未設定 GROQ_API_KEY 環境變數');
  process.exit(1);
}

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

Please generate the complete video key points summary:`
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

請生成完整的影片重點摘要：`
    };
  }
}

app.post('/api/generate-summary', async (req, res) => {
  try {
    const { videoData } = req.body;

    if (!videoData) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少影片資料' 
      });
    }

    const { title, description, transcript, transcriptSegments } = videoData;
    const contentToAnalyze = transcript || description || title;

    if (!contentToAnalyze) {
      return res.status(400).json({ 
        success: false, 
        error: '沒有可分析的內容' 
      });
    }

    const detectedLanguage = detectLanguage(title + ' ' + description + ' ' + transcript);
    const langConfig = getLanguageConfig(detectedLanguage);
    const isEnglish = detectedLanguage === 'en';

    const shouldSplit = contentToAnalyze.length > 2000;
    let summary;

    if (!shouldSplit) {
      let content = '';
      if (title) content += (isEnglish ? `Title: ${title}\n\n` : `標題：${title}\n\n`);
      if (description) content += (isEnglish ? `Description: ${description}\n\n` : `描述：${description}\n\n`);
      if (transcript) content += (isEnglish ? `Transcript: ${transcript}` : `字幕內容：${transcript}`);

      const prompt = langConfig.singlePrompt(content);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: langConfig.systemMessage
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 錯誤：${response.status}`);
      }

      const data = await response.json();
      summary = data.choices?.[0]?.message?.content?.trim();

      if (!summary) {
        throw new Error('無法生成重點摘要');
      }
    } else {
      const chunks = splitIntoChunks(contentToAnalyze);
      const chunkSummaries = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkSummary = await analyzeChunk(
          chunks[i], 
          i, 
          chunks.length, 
          title, 
          description, 
          langConfig,
          isEnglish
        );
        chunkSummaries.push(chunkSummary);
      }

      if (chunks.length > 1) {
        const combinedSummary = chunkSummaries.join('\n\n');
        const finalPrompt = langConfig.finalPrompt(combinedSummary);

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: langConfig.systemMessage
              },
              {
                role: 'user',
                content: finalPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1500
          })
        });

        if (!response.ok) {
          return res.json({ success: true, summary: combinedSummary });
        }

        const data = await response.json();
        summary = data.choices?.[0]?.message?.content?.trim() || combinedSummary;
      } else {
        summary = chunkSummaries[0];
      }
    }

    res.json({ success: true, summary });
  } catch (error) {
    console.error('生成摘要錯誤：', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '生成摘要時發生錯誤' 
    });
  }
});

function splitIntoChunks(text, maxChunkSize = 2000, overlap = 200) {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChunkSize;
    
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('。', end);
      const lastPeriod2 = text.lastIndexOf('.', end);
      const lastBreak = Math.max(lastPeriod, lastPeriod2);
      
      if (lastBreak > start + maxChunkSize * 0.5) {
        end = lastBreak + 1;
      }
    }

    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

async function analyzeChunk(chunk, chunkIndex, totalChunks, title, description, langConfig, isEnglish) {
  let content = '';
  
  if (title && chunkIndex === 0) {
    content += isEnglish ? `Title: ${title}\n\n` : `標題：${title}\n\n`;
  }
  if (description && chunkIndex === 0) {
    content += isEnglish ? `Description: ${description}\n\n` : `描述：${description}\n\n`;
  }
  content += isEnglish 
    ? `Video content segment ${chunkIndex + 1}/${totalChunks}:\n${chunk}`
    : `影片內容片段 ${chunkIndex + 1}/${totalChunks}：\n${chunk}`;

  const prompt = langConfig.chunkPrompt(content, chunkIndex, totalChunks);

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: langConfig.systemMessage
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API 錯誤：${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'SumVid API' });
});

app.listen(PORT, () => {
  console.log(`SumVid 後端服務運行在 http://localhost:${PORT}`);
});

