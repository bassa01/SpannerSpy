import { useCallback, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";

import { normalizeSchema } from "@shared/lib/normalize-schema";
import { sampleSchema } from "@shared/sample/schema";
import type { SpannerSchema } from "@shared/types";

import { ThemeToggle } from "./ThemeToggle";
import type { ThemeMode } from "./ThemeToggle";

interface ControlPanelProps {
  onSchemaLoaded: (schema: SpannerSchema) => void;
  onError: (message: string | null) => void;
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export function ControlPanel({ onSchemaLoaded, onError, theme, onThemeChange }: ControlPanelProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState(() => JSON.stringify(sampleSchema, null, 2));
  const [isDragging, setIsDragging] = useState(false);

  const presentSchema = useCallback(
    (schema: SpannerSchema) => {
      onSchemaLoaded(schema);
      onError(null);
    },
    [onError, onSchemaLoaded],
  );

  const parseText = async (text: string) => {
    try {
      const parsed = JSON.parse(text) as SpannerSchema;
      const normalized = normalizeSchema(parsed);
      presentSchema(normalized);
    } catch (error) {
      onError(`Schema import failed: ${(error as Error).message}`);
    }
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const content = await file.text();
    await parseText(content);
  };

  const onFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    await handleFile(file);
    event.target.value = "";
  };

  const onDrop = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    await handleFile(file);
  };

  const submitPaste = async (event: FormEvent) => {
    event.preventDefault();
    await parseText(pasteValue);
  };

  return (
    <section className="control-panel glass-panel" aria-label="Schema controls">
      <div className="control-header">
        <div>
          <p className="hero-pill" style={{ marginBottom: 8 }}>
            Schema Intake
          </p>
          <h2 className="control-title">Bring your Cloud Spanner model to life</h2>
          <p className="control-description">
            Upload JSON exported from INFORMATION_SCHEMA or start with the curated sample set. Every payload is normalized in
            real time before a single node renders.
          </p>
        </div>
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      </div>

      <div className="control-actions">
        <button type="button" className="primary-button" onClick={() => presentSchema(normalizeSchema(sampleSchema))}>
          Load curated sample
        </button>
        <label
          className={`file-input-label ${isDragging ? "dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          Drop or Browse JSON
          <input type="file" accept="application/json,.json" onChange={onFileInput} />
        </label>
        <button type="button" className="secondary-button" onClick={() => setPasteOpen((state) => !state)}>
          {pasteOpen ? "Hide" : "Paste"} JSON payload
        </button>
      </div>

      <p className="control-footnote">Validation mirrors our in-house tooling—foreign keys, interleaves, and arrays are linted instantly.</p>

      {pasteOpen && (
        <form onSubmit={submitPaste} className="paste-form">
          <div className="paste-form__header">
            <span>Paste JSON payload</span>
            <span className="hero-chip">Live validation</span>
          </div>
          <textarea
            className="paste-area"
            spellCheck={false}
            value={pasteValue}
            onChange={(event) => setPasteValue(event.target.value)}
            aria-label="Schema JSON"
          />
          <div className="paste-form__actions">
            <button type="button" className="secondary-button" onClick={() => setPasteValue(JSON.stringify(sampleSchema, null, 2))}>
              Reset
            </button>
            <button type="submit" className="primary-button">
              Visualize schema
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
