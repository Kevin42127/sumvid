document.addEventListener('DOMContentLoaded', async () => {
  const generateBtn = document.getElementById('generateBtn');
      const loading = document.getElementById('loading');
      const loadingText = document.getElementById('loadingText');
      const progressFill = document.getElementById('progressFill');
      const progressText = document.getElementById('progressText');
      const successAnimation = document.getElementById('successAnimation');
      const summary = document.getElementById('summary');
      const summaryContent = document.getElementById('summaryContent');
      const error = document.getElementById('error');
      const errorMessage = document.getElementById('errorMessage');
      const videoInfo = document.getElementById('videoInfo');
      const videoTitle = document.getElementById('videoTitle');
      const status = document.getElementById('status');
      const copyBtn = document.getElementById('copyBtn');

  generateBtn.addEventListener('click', async () => {
    try {
      generateBtn.disabled = true;
      hideAll();
      progressFill.style.width = '0%';
      progressText.textContent = '0%';
      loading.classList.remove('hidden');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.includes('youtube.com/watch')) {
        showError('請在 YouTube 影片頁面使用此功能');
        generateBtn.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }, async (response) => {
        if (chrome.runtime.lastError) {
          showError('無法取得影片資訊，請重新整理頁面後再試');
          generateBtn.disabled = false;
          return;
        }

        if (!response || !response.success) {
          showError(response?.error || '無法取得影片資訊');
          generateBtn.disabled = false;
          return;
        }

        if (response.videoTitle) {
          videoTitle.textContent = response.videoTitle;
          showElement(videoInfo);
        }

        const videoData = {
          title: response.videoTitle || '',
          description: response.videoDescription || '',
          transcript: response.transcript || '',
          transcriptSegments: response.transcriptSegments || []
        };

        const progressListener = (message) => {
          if (message.action === 'updateProgress' && message.progress) {
            const { current, total, text } = message.progress;
            const percentage = Math.round((current / total) * 100);
            
            progressFill.style.width = `${percentage}%`;
            progressText.textContent = `${percentage}%`;
            
            if (total > 1) {
              loadingText.textContent = `${text} (${current}/${total})`;
            } else {
              loadingText.textContent = text || '正在分析影片內容...';
            }
          }
        };

        chrome.runtime.onMessage.addListener(progressListener);

        chrome.runtime.sendMessage(
          { action: 'generateSummary', data: videoData },
          (summaryResponse) => {
            chrome.runtime.onMessage.removeListener(progressListener);
            generateBtn.disabled = false;
            loading.classList.add('hidden');

            if (chrome.runtime.lastError) {
              showError('無法連接到背景服務');
              return;
            }

            if (!summaryResponse || !summaryResponse.success) {
              showError(summaryResponse?.error || '生成重點時發生錯誤');
              return;
            }

            summaryContent.textContent = summaryResponse.summary;
            
            loading.classList.add('hidden');
            successAnimation.classList.remove('hidden');
            
            setTimeout(() => {
              successAnimation.classList.add('hidden');
              showElement(summary);
            }, 1500);
          }
        );
      });
    } catch (err) {
      generateBtn.disabled = false;
      loading.classList.add('hidden');
      showError('發生未預期的錯誤：' + err.message);
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = summaryContent.textContent;
    try {
      await navigator.clipboard.writeText(text);
      showStatus('已複製到剪貼簿');
    } catch (err) {
      showError('複製失敗');
    }
  });

  function hideAll() {
    loading.classList.add('hidden');
    summary.classList.add('hidden');
    error.classList.add('hidden');
    status.classList.add('hidden');
    videoInfo.classList.add('hidden');
    successAnimation.classList.add('hidden');
  }

  function showError(message) {
    hideAll();
    errorMessage.textContent = message;
    setTimeout(() => {
      error.classList.remove('hidden');
    }, 10);
  }

  function showStatus(message) {
    status.textContent = message;
    status.classList.remove('hidden');
    setTimeout(() => {
      status.classList.add('hidden');
    }, 2000);
  }

  function showElement(element) {
    element.classList.remove('hidden');
  }
});

