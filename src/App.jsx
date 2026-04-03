import { useState } from 'react';
import './App.css';

const STYLE_PRESETS = [
  { id: 'none', label: 'No Style', promptModifier: '' },
  { id: 'cinematic', label: 'Cinematic', promptModifier: ', cinematic lighting, highly detailed, dramatic, 8k resolution' },
  { id: 'anime', label: 'Anime', promptModifier: ', anime style, studio ghibli, vibrant colors, 2d illustration' },
  { id: 'photoreal', label: 'Photorealistic', promptModifier: ', photorealistic, ultra-realistic, 8k resolution, crisp' },
  { id: '3d', label: '3D Render', promptModifier: ', 3d render, octane render, unreal engine 5, ray tracing' }
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square' },
  { id: '16:9', label: 'Landscape' },
  { id: '9:16', label: 'Portrait' }
];

function App() {
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('none');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);

  const query = async (data) => {
    const response = await fetch(
      "https://router.huggingface.co/nscale/v1/images/generations",
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      let errorMessage = `API Error ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        errorMessage = errJson.error || errJson.message || errorMessage;
      } catch (e) {
        errorMessage = errText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const result = await response.json();
      return { type: "json", data: result };
    } else {
      const blob = await response.blob();
      return { type: "blob", data: blob };
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setImageUrl(null); // Clear previous image
    setError(null);    // Clear previous error

    try {
      const selectedStyle = STYLE_PRESETS.find(s => s.id === stylePreset);
      const modifiedPrompt = prompt + (selectedStyle ? selectedStyle.promptModifier : '');

      const result = await query({
        response_format: "b64_json",
        prompt: modifiedPrompt,
        model: "stabilityai/stable-diffusion-xl-base-1.0",
      });

      if (result.type === "json") {
        const json = result.data;
        if (json.data && json.data[0] && json.data[0].b64_json) {
          setImageUrl(`data:image/png;base64,${json.data[0].b64_json}`);
        } else if (json.image) {
          setImageUrl(`data:image/png;base64,${json.image}`);
        } else {
          throw new Error("Unexpected JSON format from API.");
        }
      } else {
        const url = URL.createObjectURL(result.data);
        setImageUrl(url);
      }
    } catch (err) {
      console.error("Generation failed:", err);
      setError(err.message || "Failed to generate image. Please try checking your API token.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <div className="generator-card">
        <div className="header">
          <h1>Aura Studio</h1>
          <p>Elegance powered by artificial intelligence</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className={`image-display ratio-${aspectRatio.replace(':', '-')}`}>
          {isGenerating ? (
            <div className="loader"></div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={prompt} className="generated-image" />
          ) : (
            <div className="placeholder-text">Generated image will appear here</div>
          )}
        </div>

        <div className="options-container">
          <div className="option-group">
            <span className="option-label">Style Effect</span>
            <div className="pills-wrapper">
              {STYLE_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStylePreset(preset.id)}
                  className={`pill-btn ${stylePreset === preset.id ? 'active' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="option-group">
            <span className="option-label">Aspect Ratio</span>
            <div className="pills-wrapper">
              {ASPECT_RATIOS.map(ratio => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => setAspectRatio(ratio.id)}
                  className={`pill-btn ${aspectRatio === ratio.id ? 'active' : ''}`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="input-group">
          <input
            type="text"
            className="prompt-input"
            placeholder="Describe your masterpiece..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
          />
          <div className="actions-group">
            <button
              type="submit"
              className="generate-btn"
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="btn-loader"></div>
                  Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </button>
            {imageUrl && !isGenerating && (
              <a
                href={imageUrl}
                download={`AuraStudio-${Date.now()}.png`}
                className="download-btn"
                title="Download Image"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
