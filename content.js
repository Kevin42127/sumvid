chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    try {
      const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title yt-formatted-string, h1.ytd-video-primary-info-renderer');
      const title = titleElement ? titleElement.textContent.trim() : '';

      const descriptionElement = document.querySelector('#description-text, #description, ytd-expander #content');
      const description = descriptionElement ? descriptionElement.textContent.trim() : '';

      let transcript = '';
      let transcriptSegments = [];
      const transcriptButton = document.querySelector('button[aria-label*="字幕"], button[aria-label*="transcript"]');
      
      if (transcriptButton) {
        const transcriptPanel = document.querySelector('ytd-transcript-renderer, #transcript');
        if (transcriptPanel) {
          const transcriptItems = transcriptPanel.querySelectorAll('ytd-transcript-segment-renderer, .segment-text');
          transcriptSegments = Array.from(transcriptItems)
            .map(item => {
              const text = item.querySelector('.segment-text, yt-formatted-string');
              return text ? text.textContent.trim() : '';
            })
            .filter(text => text.length > 0);
          transcript = transcriptSegments.join(' ');
        }
      }

      if (!title && !description && !transcript) {
        sendResponse({ success: false, error: '無法取得影片資訊' });
        return;
      }

      sendResponse({
        success: true,
        videoTitle: title,
        videoDescription: description,
        transcript: transcript,
        transcriptSegments: transcriptSegments
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

