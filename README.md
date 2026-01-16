# AVA (Digital Version) (BETA)

**Artificial Vision Assistant (AVA)** is a smart desktop assistant designed to enhance your learning experience. It monitors your screen in real-time to identify questions and provide accurate answers using the power of Google Gemini AI.

---

## 🚀 Features

- **Real-time Screen Monitoring:** Automatically detects text and questions on your screen.
- **AI-Powered Answers:** Leverages Google Gemini for high-quality, contextual responses.
- **Hybrid OCR Trigger:** Intelligent detection combining OCR and AI for improved accuracy.
- **Customizable Settings:** Easily configure API keys, AI models, and debug options.
- **Consolidated Logging:** Clean and informative console logs with debug mode support.
- **User-Friendly Interface:** Built with React and Lucide icons for a modern look.

## 🛠️ Technologies Used

- **Frontend:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **AI Integration:** [Google Gemini API](https://ai.google.dev/)
- **OCR Engine:** [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Icons:** [Lucide React](https://lucide.dev/)

## ⚙️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- A Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JustJade2007/AVA-School-Assistant.git
   cd AVA-School-Assistant
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
   *Alternatively, you can enter your API key directly within the app's settings panel.*

### Running the App

Start the development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧩 AVA Bridge Extension

To enable the **Auto-Select** and **Auto-Next** features, you must install the helper browser extension. This allows AVA to interact with your school testing tabs securely.

### 🚀 Installation Steps

1. **Open Extension Settings**:
   - In Chrome, Edge, or Brave, navigate to `chrome://extensions`.
   - Alternatively, click the puzzle piece icon and select "Manage Extensions".

2. **Enable Developer Mode**:
   - Toggle the **Developer Mode** switch in the top-right corner of the extensions page.

3. **Load the Extension**:
   - Click the **Load unpacked** button.
   - Select the `extension` folder in this project directory.

4. **Verify Installation**:
   - You should see "AVA Bridge" in your list of extensions. No further configuration is needed.

### 🛠 How to Use

1. **Enable Auto-Click**:
   - In the AVA App, go to the **System Hub** (Settings).
   - Toggle **Auto-Click** under the "Output & Execution" section.
   
2. **Configure Safety**:
   - Adjust the **Safe Threshold** slider. AI will only click if its confidence is above this percentage.
   - Toggle **Auto-Next** if you want the AI to automatically progress to the next question.

3. **Running**:
   - Start your screen capture as usual.
   - When a question is detected and confidence is high enough, AVA will automatically select the answer in your other tab.

---

## 📜 Changelog

### [1.3.3.a] - 2026-01-15
- **Added:** Auto-Select Answer functionality via the new AVA Bridge browser extension.
- **Added:** Auto-Next capability to automatically progress through questions.
- **Added:** Customizable Confidence Threshold to prevent automatic clicks on uncertain answers.
- **Added:** Integrated Extension Setup Guide in the settings panel.
- **Added:** Extension bridge support using `window.postMessage` and Browser Extension coordination.

### [1.3.2.a] - 2026-01-15
- **Added:** Multi-Question Detection support for scroll-style tests.
- **Added:** Integrated API Key Guide with setup instructions and free tier limits.
- **Improved:** High-fidelity neural animations including scan lines, shimmer effects, and glowing pulses.
- **Refactored:** Analysis results now support multiple questions simultaneously.

### [1.3.1.a] - 2026-01-15
- **Added:** Progress bar for timed scans showing countdown to next analysis.
- **Added:** Secure API Key management with encrypted cookie storage.
- **Added:** Instant API Key recovery popup when authentication is missing.
- **Added:** Live Cognition display to show AI thinking process during generation.
- **Added:** Persistent AI thinking option to keep reasoning visible after analysis.

### [1.3.0.c] - 2026-01-15
- **Added:** Custom AI directives/instructions for personalized analysis.
- **Added:** Ability to download system logs as a text file.
- **Improved:** Categorized Settings Hub for better navigation.
- **Improved:** Neural animation now plays on every request for better feedback.
- **Improved:** Added explicit log entries for analysis start and completion.
- **Fixed:** Screen flashing issue during automated vision scans.

### [1.3.0.b] - 2026-01-15
- **Fixed:** TTS bot now correctly reads all answers when multiple are detected.
- **Improved:** Smart Detect now only triggers a request when a question is actually detected in the frame.
- **Improved:** Logic Synthesis display is now expandable to save space.

### [1.3.0.a] - 2026-01-15
- **Improved:** AI now ignores pre-selected answers in screenshots to provide unbiased analysis.

### [1.3.0] - 2026-01-15
- **Added:** Neural Context support (Links, Raw Text, Pictures, PDFs, Videos).
- **Added:** Model compatibility validation for multimodal context.

### [1.2.0] - 2026-01-15
- **Added:** Hybrid AI/OCR trigger for more reliable question detection.
- **Added:** GitHub link button for easy access to the repository.
- **Improved:** Question text extraction now ensures only the actual question is displayed, removing clutter from OCR or multiple-choice options.
- **Improved:** Consolidated logging to reduce repetitive messages in the console.
- **Improved:** Error handling for Gemini API, specifically adding retries for empty responses.
- **Added:** Support for manual Gemini API key input via the Settings Panel.
- **Refactored:** Settings Panel and TypeScript configurations for better maintainability.
- **Fixed:** AI model selection bug where the system would sometimes stick to the default model.
- **Changed:** Set Gemini Flash Lite latest as the default AI model.

### [1.1.0] - Earlier
- Initial Beta release of AVA (Digital Version).
- Implementation of core OCR and Gemini AI integration.
- Real-time screen capture and analysis.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs or feature requests.

## 📄 License

This project is currently unlicensed. Please contact the repository owner for usage permissions.

---

*Made with ❤️ by [JustJade2007](https://github.com/JustJade2007)*
