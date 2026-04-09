"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type ImportAnalyzeResult } from "@/lib/api";

export default function UploadPortfolioPage() {
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportAnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("My Portfolio");
  const [cash, setCash] = useState("");
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const raw = await api.importCsv(file, name, cash ? parseFloat(cash) : undefined);
      // Normalize response (seed endpoint uses import_, auth endpoint uses import)
      const res = { import: (raw as any).import_ ?? (raw as any).import ?? raw, analysis: (raw as any).analysis ?? null } as ImportAnalyzeResult;
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [name, cash]);

  const handleTextImport = async () => {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const raw = await api.importText(textInput, name, cash ? parseFloat(cash) : undefined);
      const res = { import: (raw as any).import_ ?? (raw as any).import ?? raw, analysis: (raw as any).analysis ?? null } as ImportAnalyzeResult;
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-bold">Upload Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import your holdings from a CSV file or paste them directly. We&apos;ll analyze everything with AI.
        </p>
      </div>

      {/* Portfolio name + cash */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Portfolio Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Cash Balance ($)</label>
          <input
            type="number"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            placeholder="0.00"
            className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Toggle: File vs Text */}
      <div className="flex gap-2">
        <button
          onClick={() => setTextMode(false)}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${!textMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Upload className="h-4 w-4 inline mr-1.5" /> Upload File
        </button>
        <button
          onClick={() => setTextMode(true)}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${textMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
        >
          <FileText className="h-4 w-4 inline mr-1.5" /> Paste Text
        </button>
      </div>

      {!textMode ? (
        /* File Upload */
        <div className="space-y-4">
          {/* Step 1: Select file */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <label className="text-sm font-medium mb-3 block">Step 1: Select your CSV file</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setSelectedFile(f);
              }}
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2.5 file:px-6
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-white
                hover:file:bg-primary/90
                file:cursor-pointer cursor-pointer"
            />
            {selectedFile && (
              <p className="mt-3 text-sm text-emerald-400 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Step 2: Upload & Analyze */}
          <Button
            onClick={() => selectedFile && handleFile(selectedFile)}
            disabled={!selectedFile || uploading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-white text-base font-semibold"
          >
            {uploading ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Importing & Analyzing with AI...</>
            ) : (
              <><Brain className="h-5 w-5 mr-2" /> Upload & Analyze Portfolio</>
            )}
          </Button>
        </div>
      ) : (
        /* Text Paste */
        <div className="space-y-3">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={"AAPL 100 150.00\nNVDA 50 450.00\nMSFT 75 380.00\nGOOGL 30 140.00"}
            rows={8}
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-sm font-[var(--font-mono)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Format: TICKER QUANTITY AVGCOST (one per line, comma or space separated)
          </p>
          <Button
            onClick={handleTextImport}
            disabled={uploading || !textInput.trim()}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            Import & Analyze
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-500">Import Failed</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Import summary */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <h2 className="font-[var(--font-heading)] text-lg font-semibold">
                Portfolio Imported Successfully
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Holdings Imported</p>
                <p className="font-[var(--font-heading)] text-2xl font-bold">{result.import.holdingsImported}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="font-[var(--font-mono)] text-2xl font-bold">
                  ${result.import.totalCurrentValue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total P&L</p>
                <p className={`font-[var(--font-mono)] text-2xl font-bold ${result.import.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {result.import.totalPnl >= 0 ? "+" : ""}${result.import.totalPnl.toLocaleString()}
                </p>
              </div>
            </div>
            {result.import.notFoundTickers.length > 0 && (
              <p className="mt-3 text-xs text-amber-400">
                Tickers not found: {result.import.notFoundTickers.join(", ")}
              </p>
            )}
          </div>

          {/* AI Analysis */}
          {result.analysis && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="font-[var(--font-heading)] text-lg font-semibold">AI Analysis</h2>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="font-[var(--font-heading)] text-3xl font-bold">{Math.round(result.analysis.healthScore)}</p>
                  <p className="text-xs text-muted-foreground">Health Score</p>
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${result.analysis.healthScore >= 70 ? "bg-emerald-500" : result.analysis.healthScore >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${result.analysis.healthScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {result.analysis.recommendations.length > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Recommendations ({result.analysis.recommendations.length})
                  </p>
                  {result.analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/30 p-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        rec.action === "BUY" || rec.action === "INCREASE" ? "bg-emerald-500/10 text-emerald-400"
                          : rec.action === "SELL" || rec.action === "REDUCE" ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {rec.action}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{rec.ticker || rec.type}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{rec.reasoning}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(rec.confidence)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View Portfolio button */}
          <Button
            onClick={() => router.push(`/portfolio/${result.import.portfolioId}`)}
            className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-base font-semibold"
          >
            View Full Portfolio <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Supported formats */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Supported Formats</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span><strong>Robinhood</strong> — Symbol, Quantity, Average Cost</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span><strong>Schwab</strong> — Symbol, Quantity, Cost Basis</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span><strong>Fidelity</strong> — Symbol, Quantity, Cost Basis Per Share</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span><strong>Generic CSV</strong> — Any file with ticker + shares + cost columns</span>
          </div>
        </div>
      </div>
    </div>
  );
}
