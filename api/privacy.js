const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const privacyPath = path.join(__dirname, '..', 'privacy.html');
    const privacyContent = fs.readFileSync(privacyPath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(privacyContent);
  } catch (error) {
    console.error('Error loading privacy policy:', error);
    res.status(500).json({ error: '無法載入隱私權政策' });
  }
};

