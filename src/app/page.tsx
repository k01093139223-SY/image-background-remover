"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface User {
  google_id: string;
  email: string;
  name: string;
  avatar_url: string;
}

export default function Home() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检查用户登录状态
  useEffect(() => {
    const sessionCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_session="));
    
    if (sessionCookie) {
      try {
        const userData = JSON.parse(decodeURIComponent(sessionCookie.split("=")[1]));
        setUser(userData);
      } catch (e) {
        console.error("Failed to parse user session:", e);
      }
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("请上传 PNG、JPG 或 WEBP 格式的图片");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      return;
    }
    
    setError(null);
    setProcessedImage(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const removeBackground = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Convert base64 to blob for API upload
      const base64Data = originalImage.split(",")[1];
      
      const response = await fetch("/api/remove-bg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Data }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "处理失败，请重试");
      }
      
      const data = await response.json();
      setProcessedImage(`data:image/png;base64,${data.result}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "处理失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    
    const link = document.createElement("a");
    link.href = processedImage;
    link.download = "removed-bg.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogout = () => {
    document.cookie = "user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
  };

  const handleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Image BG Remover</h1>
            <p className="text-sm text-gray-500">AI-powered background removal</p>
          </div>
          {user ? (
            <div className="flex items-center gap-3">
              <img 
                src={user.avatar_url} 
                alt={user.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                登出
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              登录
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Upload Area */}
        {!originalImage && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-200
              ${isDragging 
                ? "border-blue-500 bg-blue-50" 
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-6xl mb-4">📤</div>
            <p className="text-lg font-medium text-gray-700">
              点击或拖拽上传图片
            </p>
            <p className="text-sm text-gray-500 mt-2">
              支持 PNG、JPG、WEBP，最大 10MB
            </p>
          </div>
        )}

        {/* Preview & Actions */}
        {originalImage && !isProcessing && !processedImage && (
          <div className="space-y-6">
            {/* Original Preview */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">原图</h2>
              <div className="flex justify-center">
                <img
                  src={originalImage}
                  alt="Original"
                  className="max-w-full max-h-96 object-contain rounded-lg"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={removeBackground}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                ✨ 去除背景
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                重新上传
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {isProcessing && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-lg font-medium text-gray-700">正在处理图片...</p>
            <p className="text-sm text-gray-500 mt-2">预计需要几秒钟</p>
            <div className="mt-6 w-48 mx-auto bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse w-2/3"></div>
            </div>
          </div>
        )}

        {/* Result Comparison */}
        {processedImage && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Original */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">原图</h2>
                <div className="flex justify-center">
                  <img
                    src={originalImage!}
                    alt="Original"
                    className="max-w-full max-h-64 object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Processed */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">去除背景后</h2>
                <div className="flex justify-center bg-checkerboard rounded-lg p-4">
                  <img
                    src={processedImage}
                    alt="Processed"
                    className="max-w-full max-h-64 object-contain rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={downloadImage}
                className="px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>⬇️</span> 下载结果
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                处理新图片
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6">
            <p className="text-red-700 text-center">⚠️ {error}</p>
            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 text-red-600 hover:text-red-800"
              >
                关闭
              </button>
              {originalImage && (
                <button
                  onClick={removeBackground}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  重试
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-500">
        <p>© 2026 Image BG Remover • 纯内存处理，不保存任何图片</p>
      </footer>
    </div>
  );
}
