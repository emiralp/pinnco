"use client";

import { ArrowUpRight, BoltIcon, BotIcon, Check, Copy, FileText, FolderOpen, Github, Heart, Loader, Shield, SparkleIcon, Sparkles, Terminal, Trash2, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Type definitions
interface FileWithPath extends File {
    path?: string;
}

const SAC = () => {
    // Core state
    const [content, setContent] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [fileCount, setFileCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [totalSize, setTotalSize] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Refs for cleanup
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const shouldSkipEntry = (name: string): boolean => {
        return SKIP_PATTERNS.some(pattern => name.toLowerCase().includes(pattern.toLowerCase()));
    };

    const processFileEntry = async (entry: FileSystemEntry, path = ''): Promise<string> => {
        if (shouldSkipEntry(entry.name)) return '';

        if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            try {
                const file = await new Promise<FileWithPath>((resolve) => fileEntry.file(resolve));
                if (file.size > MAX_FILE_SIZE) return '';

                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                if (!extension || !ACCEPTED_TYPES.includes(extension)) return '';

                const content = await file.text();
                setTotalSize(prev => prev + file.size);
                return `\n\n// File: ${path ? `${path}/` : ''}${file.name}\n${content}`;
            } catch (error) {
                console.error(`Error reading ${entry.name}:`, error);
                return '';
            }
        }

        if (entry.isDirectory) {
            const dirEntry = entry as FileSystemDirectoryEntry;
            try {
                const dirReader = dirEntry.createReader();
                const entries = await new Promise<FileSystemEntry[]>((resolve) => {
                    const results: FileSystemEntry[] = [];
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
            console.error(err);
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
        }
    };

    // Drop handler
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        setProcessing(true);
        setTotalSize(0);
        setGenerating(true)

        setTimeout(() => {
            setGenerating(false)
        }, 3000)

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
                    <a href="/" className="flex hover:scale-105 hover:-rotate-1 transform transition duration-1 cursor-pointer items-center gap-2">
                        <BotIcon className="w-6 h-6 text-blue-600" />
                        <span className="font-bold text-xl">SAC</span>
                        <span className="text-gray-500">by Pinn.co</span>
                    </a>
                    <a
                        href="https://luw.ai/?utm_source=Pinnco"
                        target="_blank"
                        rel="noopener"
                        className="flex hidden md:flex items-center gap-2 text-lg text-blue-600 hover:text-gray-900 transition-colors"
                    >
                        <BotIcon className="w-4 h-4" />
                        <span>Try Our Free AI Suite</span>
                    </a>
                    <a
                        href="https://github.com/emiralp/pinnco/"
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
                {!generating ? <>
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            Streamlined AI Context
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Transform your codebase into an optimized AI-friendly format.
                            Seamlessly integrate your entire project context with AI tools like Claude and ChatGPT.
                        </p>
                    </div>
                </> : <>
                    <div className="text-center mt-6">
                        <div className="text-xl flex justify-center items-center text-gray-600 max-w-3xl mx-auto">
                            <div className='animate-spin'>
                                <Loader />
                            </div>
                        </div>
                    </div>
                </>}

                {!generating && !content && <>
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
                </>}


                {!generating && content && (
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

<div className="relative mt-16 mb-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-10 rounded-2xl transform -rotate-1"></div>
                    <div className="relative bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-500/20 rounded-full p-2">
                                <Heart className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Why I Built This
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <p className="text-gray-300 leading-relaxed">
                                When working with AI tools like Claude or ChatGPT, I found myself constantly struggling with
                                code sharing. Without using specialized IDEs, I had to either upload files separately or
                                manually merge them.
                            </p>

                            <div className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <div className="flex-shrink-0">
                                    <Sparkles className="w-6 h-6 text-blue-400" />
                                </div>
                                <p className="text-blue-200">
                                    This tool magically transforms your project into AI-pastable content in seconds, and it's completely FREE!
                                </p>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <BoltIcon className="w-4 h-4" />
                                <p>Automatically excludes node_modules and cache files for optimal performance</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Tools Banner */}
                <div className="mt-24 p-6 bg-white rounded-xl border border-gray-200 shadow-lg">
                    <div className="px-8 py-12 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="bg-purple-500/20 rounded-full p-2">
                                    <Zap className="w-5 h-5 text-purple-400" />
                                </div>
                                <span className="text-sm font-medium text-purple-500">
                                    Try Our Full AI Collection
                                </span>
                            </div>
                            <h2 className="text-5xl md:text-7xl font-bold">
                                Transform Your Space with{' '}
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600">
                                    Luw.ai
                                </span>
                            </h2>
                            <p className="text-zinc-400 leading-relaxed max-w-2xl">
                                Create stunning interior designs & room plans for free with AI. Transform any space - from room layouts
                                to exterior makeovers. Virtual staging made easy.
                            </p>
                            <div className="flex items-center gap-4 pt-2">
                                <a
                                    href="https://luw.ai?utm_source=Pinnco"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex font-bold items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors"
                                >
                                    Try Luw.ai for Free!
                                    <ArrowUpRight className="w-4 h-4" />
                                </a>
                                <div className="flex -space-x-2">
                                    {[
                                        "https://luvi.imgix.net/luwai-10db78ea2bd139927f8b4f6c2ad1620c/ppl2.jpeg?w=60&h=60&q=50&auto=format",
                                        "https://luvi.imgix.net/luwai-10db78ea2bd139927f8b4f6c2ad1620c/ppl3.jpeg?w=60&h=60&q=50&auto=format",
                                        "https://luvi.imgix.net/luwai-10db78ea2bd139927f8b4f6c2ad1620c/ppl1.jpeg?w=60&h=60&q=50&auto=format"
                                    ].map((oo, i) => (
                                        <div
                                            key={i}
                                            className="w-8 overflow-hidden h-8 rounded-full border-2 border-orange-400 bg-zinc-800"
                                        >
                                            <img src={oo} />
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-orange-400 bg-purple-700 flex items-center justify-center">
                                        <span className="text-xs font-bold text-purple-100 mt-0.5">50K+</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-full md:w-72 h-48 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <video poster="https://luvi.imgix.net/Luvi-f766175dd0d728423f52f00ece50aac6/video-capture-luw.png?w=584&amp;h=488&amp;fit=crop&amp;q=50&amp;auto=format" preload="metadata" playsInline={true} autoPlay={true} muted={true} loop={true} className="rounded-2xl shadow-2xl floating">
                                <source src="https://luvi.imgix.net/luwai-10db78ea2bd139927f8b4f6c2ad1620c/luwvid.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                </div>

                
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