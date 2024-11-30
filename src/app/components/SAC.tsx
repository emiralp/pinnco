"use client";

import { BotIcon, Check, Copy, FileText, FolderOpen, Github, Shield, Terminal, Trash2, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
const SAC = () => {
    // Core state
    const [content, setContent] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [fileCount, setFileCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [totalSize, setTotalSize] = useState(0);
    const [processing, setProcessing] = useState(false);

    // Refs for cleanup
    const copyTimeoutRef = useRef(null);

    // File processing configuration
    const ACCEPTED_TYPES = [
        '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss',
        '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.cpp', '.c', '.cs',
        '.sql', '.json', '.yaml', '.toml', '.env', '.md', '.txt', '.csv'
    ];

    const SKIP_PATTERNS = [
        'node_modules', 'vendor', 'dist', 'build', '.git',
        '__pycache__', 'venv', '.env', 'coverage', 'tmp'
    ];

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    // File processing utilities
    const shouldSkipEntry = (name) => {
        return SKIP_PATTERNS.some(pattern => name.toLowerCase().includes(pattern.toLowerCase()));
    };

    const processFileEntry = async (entry, path = '') => {
        if (shouldSkipEntry(entry.name)) return '';

        if (entry.isFile) {
            try {
                const file = await new Promise((resolve) => entry.file(resolve));
                if (file.size > MAX_FILE_SIZE) return '';

                const extension = '.' + file.name.split('.').pop().toLowerCase();
                if (!ACCEPTED_TYPES.includes(extension)) return '';

                const content = await file.text();
                setTotalSize(prev => prev + file.size);
                return `\n\n// File: ${path ? `${path}/` : ''}${file.name}\n${content}`;
            } catch (error) {
                console.error(`Error reading ${file.name}:`, error);
                return '';
            }
        }

        if (entry.isDirectory) {
            try {
                const dirReader = entry.createReader();
                const entries = await new Promise((resolve) => {
                    const results = [];
                    function readEntries() {
                        dirReader.readEntries((entries) => {
                            if (entries.length) {
                                results.push(...entries);
                                readEntries();
                            } else {
                                resolve(results);
                            }
                        });
                    }
                    readEntries();
                });

                let content = '';
                for (const childEntry of entries) {
                    content += await processFileEntry(
                        childEntry,
                        path ? `${path}/${entry.name}` : entry.name
                    );
                }
                return content;
            } catch (error) {
                console.error(`Error processing directory ${entry.name}:`, error);
                return '';
            }
        }
        return '';
    };

    // Enhanced copy functionality
    const copyToClipboard = async () => {
        if (!content) return;

        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = content;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
        }
    };

    // Drop handler
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        setProcessing(true);
        setTotalSize(0);

        try {
            let newContent = '';
            let newFileCount = 0;

            for (const item of e.dataTransfer.items) {
                const entry = item.webkitGetAsEntry();
                if (entry) {
                    const content = await processFileEntry(entry);
                    if (content) {
                        newContent += content;
                        newFileCount++;
                    }
                }
            }

            if (newFileCount > 0) {
                setContent(newContent.trim());
                setFileCount(newFileCount);
            }
        } catch (error) {
            console.error('Error processing files:', error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-900">
            <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BotIcon className="w-6 h-6 text-blue-600" />
                        <span className="font-bold text-xl">SAC</span>
                        <span className="text-gray-500">by Pinn.co</span>
                    </div>
                    <a
                        href="https://github.com/yourusername/sac"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <Github className="w-4 h-4" />
                        <span>View on GitHub</span>
                    </a>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Streamlined AI Context
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Transform your codebase into an optimized AI-friendly format. 
                        Seamlessly integrate your entire project context with AI tools like Claude and ChatGPT.
                    </p>
                </div>

                <div
                    className={`
                        relative rounded-xl border-2 border-dashed p-12 mb-8 transition-all
                        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                        ${processing ? 'opacity-50' : 'hover:border-blue-500'}
                        bg-white shadow-lg
                    `}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center text-center">
                        <FolderOpen className={`w-16 h-16 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
                        <div className="mb-2 text-2xl font-medium">
                            Drop Your Project Files
                        </div>
                        <div className="text-gray-500">
                            {processing ? 'Optimizing for AI context...' : 'Supports all major programming languages'}
                        </div>
                        {fileCount > 0 && !processing && (
                            <div className="mt-4 text-sm text-gray-500">
                                {fileCount} files processed • {(totalSize / 1024).toFixed(1)}KB
                            </div>
                        )}
                    </div>
                </div>

                {content && (
                    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-600">Streamlined Context</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setContent('');
                                        setFileCount(0);
                                        setTotalSize(0);
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>Copy Context</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <pre className="p-4 text-sm overflow-x-auto whitespace-pre-wrap break-words text-gray-800">
                            {content}
                        </pre>
                    </div>
                )}

                {!content && (
                    <div className="grid md:grid-cols-3 gap-8 mt-16">
                        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
                            <Shield className="w-8 h-8 mb-4 text-blue-600" />
                            <h3 className="text-lg font-semibold mb-2">Secure Processing</h3>
                            <p className="text-gray-600">
                                All processing happens locally in your browser. Your code never leaves your machine.
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
                            <Zap className="w-8 h-8 mb-4 text-yellow-500" />
                            <h3 className="text-lg font-semibold mb-2">Instant Optimization</h3>
                            <p className="text-gray-600">
                                Transform your entire codebase into an AI-friendly format in seconds.
                            </p>
                        </div>
                        <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
                            <Terminal className="w-8 h-8 mb-4 text-green-500" />
                            <h3 className="text-lg font-semibold mb-2">AI-Enhanced Context</h3>
                            <p className="text-gray-600">
                                Optimized output format designed specifically for modern AI tools.
                            </p>
                        </div>
                    </div>
                )}
            </main>

            <footer className="mt-24 py-12 bg-gray-50 border-t border-gray-200">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <p className="text-gray-600">
                        Built by Luvi Technologies, for developers. Streamline your AI workflow today.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default SAC;