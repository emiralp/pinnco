"use client";

import {
    BotIcon, Check, Copy, FileText,
    FolderOpen, Github, Loader, Shield,
    Sparkles, Terminal, Trash2, Zap, Settings, Plus, Minus,
    ChevronDown, ChevronUp,
    KeyRound,
    Info,
    ArrowUpRight,
    Save,
    SaveIcon,
    CheckCheck
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

// Type definitions
interface AdvancedSettings {
    tokenLimit: number;
    excludePatterns: string[];
    removeComments: boolean;
    minifyCode: boolean;
    allowedFormats: string;
    githubToken: string;
    githubUrl: string;
}

interface GitHubInputProps {
    onProcess: (processing: boolean, result?: any) => void;
    processing: boolean;
    settings: AdvancedSettings;
    updateSettings: (updates: Partial<AdvancedSettings>) => void;
}

// Constants
const DEFAULT_ACCEPTED_TYPES = [
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss',
    '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.cpp', '.c', '.cs',
    '.sql', '.json', '.yaml', '.toml', '.env', '.md', '.txt', '.csv'
];
const DEFAULT_SKIP_PATTERNS = [
    'node_modules', 'vendor', 'dist', 'build', '.git',
    '__pycache__', 'venv', '.env', 'coverage', 'tmp'
];
const STORAGE_KEY = 'sac_advanced_settings';
const DEFAULT_SETTINGS: AdvancedSettings = {
    tokenLimit: 1500,
    excludePatterns: [],
    removeComments: false,
    minifyCode: false,
    allowedFormats: DEFAULT_ACCEPTED_TYPES.join('\n'),
    githubToken: '',
    githubUrl: ''
};

// Settings management hook
const useSettings = () => {
    // Initialize settings with default first
    const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_SETTINGS);

    // Create the updateSettings function
    const updateSettings = useCallback((updates: Partial<AdvancedSettings>) => {
        setSettings(current => ({
            ...current,
            ...updates
        }));
    }, []);

    // Then update from localStorage in useEffect
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Ensure all properties exist with proper types
                setSettings({
                    tokenLimit: Number(parsed.tokenLimit) || DEFAULT_SETTINGS.tokenLimit,
                    excludePatterns: Array.isArray(parsed.excludePatterns) ? parsed.excludePatterns : DEFAULT_SETTINGS.excludePatterns,
                    removeComments: Boolean(parsed.removeComments),
                    minifyCode: Boolean(parsed.minifyCode),
                    allowedFormats: typeof parsed.allowedFormats === 'string' ? parsed.allowedFormats : DEFAULT_SETTINGS.allowedFormats,
                    githubToken: String(parsed.githubToken) || DEFAULT_SETTINGS.githubToken,
                    githubUrl: String(parsed.githubUrl) || DEFAULT_SETTINGS.githubUrl
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }, []);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }, [settings]);

    return {
        settings,
        setSettings,
        updateSettings
    };
};

const SAC = () => {
    // Core state management
    const [content, setContent] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [fileCount, setFileCount] = useState(0);
    const [copied, setCopied] = useState(false);
    const [totalSize, setTotalSize] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { settings, updateSettings, setSettings } = useSettings();
    const [isSaved, setIsSaved] = useState('');

    // Advanced settings state
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [newPattern, setNewPattern] = useState('');
    const [tokenLimit, setTokenLimit] = useState(settings.tokenLimit);
    const [currentTokens, setCurrentTokens] = useState(0);
    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [help, setHelp] = useState(false);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
        };
    }, []);

    // Sync tokenLimit with settings
    useEffect(() => {
        setTokenLimit(settings.tokenLimit);
    }, [settings.tokenLimit]);

    // Reset token count when content changes
    useEffect(() => {
        const count = estimateTokenCount(content);
        setCurrentTokens(count);
    }, [content]);

    // Effect to save settings
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }, [settings]);

    // Processing timeout effect
    useEffect(() => {
        if (processing || generating) {
            processingTimeoutRef.current = setTimeout(() => {
                setProcessing(false);
                setGenerating(false);
                setError('Processing timed out. Please try again with fewer files.');
            }, 30000);

            return () => {
                if (processingTimeoutRef.current) {
                    clearTimeout(processingTimeoutRef.current);
                }
            };
        }
    }, [processing, generating]);

    // Utility functions
    const handleGitHubProcess = (processing, result = { content: "", fileCount: 0, totalSize: 0, tokenCount: 0 }) => {
        setProcessing(processing);
        setGenerating(processing);

        if (result && result.content != "") {
            setContent(result.content);
            setFileCount(result.fileCount);
            setTotalSize(result.totalSize);
            setCurrentTokens(result.tokenCount);
        }
    };

    const shouldSkipEntry = (path: string): boolean => {
        const normalizedPath = path.toLowerCase();

        // Combine default and user patterns
        const allPatterns = [
            ...DEFAULT_SKIP_PATTERNS,
            ...settings.excludePatterns
        ].map(pattern => pattern.toLowerCase().trim())
            .filter(Boolean);

        return allPatterns.some(pattern => {
            // Convert glob pattern to regex
            const regexPattern = pattern
                .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
                .replace(/\*/g, '.*')                  // Convert * to .*
                .replace(/\?/g, '.');                  // Convert ? to .

            const regex = new RegExp(regexPattern);
            return regex.test(normalizedPath);
        });
    };

    const isAllowedFileType = (filename: string): boolean => {
        const extension = '.' + filename.split('.').pop()?.toLowerCase();
        if (!extension) return false;

        const allowedTypes = settings.allowedFormats
            .split('\n')
            .map(type => type.trim().toLowerCase())
            .filter(Boolean);

        // If no allowed types are specified, accept all files
        if (allowedTypes.length === 0) return true;

        return allowedTypes.includes(extension);
    };

    const handleResetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        setTokenLimit(DEFAULT_SETTINGS.tokenLimit);
    };

    const processFileEntry = async (entry: FileSystemEntry, path = ''): Promise<string> => {
        const entryPath = path ? `${path}/${entry.name}` : entry.name;

        // Check if the entry should be skipped
        if (shouldSkipEntry(entryPath)) {
            console.log(`Skipping ${entryPath} due to exclude pattern match`);
            return '';
        }

        try {
            if (entry.isFile) {
                const fileEntry = entry as FileSystemFileEntry;
                const file = await new Promise<File>((resolve, reject) => {
                    fileEntry.file(resolve, reject);
                });

                // Size check
                if (file.size > 10 * 1024 * 1024) {
                    console.warn(`Skipping ${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
                    return '';
                }

                // Extension check
                if (!isAllowedFileType(file.name)) {
                    console.warn(`Skipping ${file.name}: File type not allowed`);
                    return '';
                }

                const content = await file.text();
                setTotalSize(prev => prev + file.size);

                let processedContent = content;
                if (settings.removeComments) {
                    // Improved comment removal for different languages
                    processedContent = processedContent
                        .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1') // Remove C-style comments
                        .replace(/^\s*#.*$/gm, '')                           // Remove shell/python style comments
                        .replace(/^\s*--.*$/gm, '')                         // Remove SQL style comments
                        .replace(/^\s*\n/gm, '')                           // Remove empty lines
                        .trim();
                }

                if (settings.minifyCode) {
                    processedContent = processedContent
                        .replace(/\s+/g, ' ')
                        .replace(/\n/g, '')
                        .trim();
                }

                // Normalize path for display
                const cleanPath = entryPath.replace(/^\/+/, '').replace(/\/+/g, '/');
                return `\n\n// File: ${cleanPath}\n${processedContent}`;
            }

            if (entry.isDirectory) {
                const dirEntry = entry as FileSystemDirectoryEntry;
                const reader = dirEntry.createReader();

                // Read all entries in the directory
                const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
                    const results: FileSystemEntry[] = [];

                    function readEntries() {
                        reader.readEntries(
                            (entries) => {
                                if (entries.length === 0) {
                                    resolve(results);
                                } else {
                                    results.push(...entries);
                                    readEntries(); // Continue reading
                                }
                            },
                            reject
                        );
                    }

                    readEntries();
                });

                // Process directory contents
                let combinedContent = '';
                for (const childEntry of entries) {
                    const content = await processFileEntry(childEntry, entryPath);
                    combinedContent += content;

                    // Check token limit
                    if (settings.tokenLimit > 0 && currentTokens >= settings.tokenLimit) {
                        console.warn('Token limit reached, stopping directory processing');
                        break;
                    }
                }

                return combinedContent;
            }

            return '';
        } catch (error) {
            console.error(`Error processing ${entry.name}:`, error);
            return '';
        }
    };

    const copyToClipboard = async () => {
        if (!content) return;

        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);

            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
            copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy using clipboard API, falling back to execCommand', err);

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

    // Helper function to estimate token count
    const estimateTokenCount = (text: string): number => {
        return Math.ceil(text.length / 4); // Approximate tokens (1 token ≈ 4 chars)
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Reset states
        setIsDragging(false);
        setContent('');
        setFileCount(0);
        setTotalSize(0);
        setError(null);
        setCurrentTokens(0);

        // Set processing states
        setProcessing(true);
        setGenerating(true);

        try {
            const items = Array.from(e.dataTransfer.items);

            if (items.length === 0) {
                throw new Error('No files dropped');
            }

            let newContent = '';
            let newFileCount = 0;
            const entries = items
                .map(item => item.webkitGetAsEntry())
                .filter((entry): entry is FileSystemEntry => entry !== null);

            // Process entries
            for (const entry of entries) {
                if (currentTokens >= tokenLimit) {
                    setError(`Token limit (${tokenLimit}) reached. Some files were skipped.`);
                    break;
                }

                const content = await processFileEntry(entry);
                if (content) {
                    newContent += content;
                    newFileCount++;
                }
            }

            if (newFileCount === 0) {
                throw new Error('No valid files found or all files exceeded token limit');
            }

            setContent(newContent.trim());
            setFileCount(newFileCount);

            // Show warning if we hit the token limit
            if (currentTokens >= tokenLimit) {
                setError(`Token limit (${tokenLimit}) reached. Some files were skipped.`);
            }

        } catch (error) {
            console.error('Error processing files:', error);
            setError(error instanceof Error ? error.message : 'Error processing files');
            setContent('');
            setFileCount(0);
            setTotalSize(0);
            setCurrentTokens(0);
        } finally {
            setGenerating(false);
            setProcessing(false);
        }
    };

    const GitHubInput: React.FC<GitHubInputProps> = ({ onProcess, processing, settings, updateSettings }) => {
        // Form state management
        const [formState, setFormState] = useState({
            url: settings.githubUrl || '',
            token: settings.githubToken || '',
            help: false,
            error: '',
            progress: { processed: 0, total: 0 }
        });

        const abortControllerRef = useRef(null);

        // Utility functions for file processing
        const shouldSkipEntry = useCallback((path) => {
            const normalizedPath = path.toLowerCase();

            // Combine default and user patterns
            const allPatterns = [
                // Default patterns
                'node_modules', 'vendor', 'dist', 'build', '.git',
                '__pycache__', 'venv', '.env', 'coverage', 'tmp',
                // User-defined patterns
                ...(settings.excludePatterns || [])
            ].map(pattern => pattern.toLowerCase().trim())
                .filter(Boolean);

            return allPatterns.some(pattern => {
                const regexPattern = pattern
                    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*')
                    .replace(/\?/g, '.');
                return new RegExp(regexPattern).test(normalizedPath);
            });
        }, [settings.excludePatterns]);

        const isAllowedFileType = useCallback((filename) => {
            const extension = '.' + filename.split('.').pop()?.toLowerCase();
            if (!extension) return false;

            const allowedTypes = settings.allowedFormats
                .split('\n')
                .map(type => type.trim().toLowerCase())
                .filter(Boolean);

            // If no allowed types are specified, accept all files
            if (allowedTypes.length === 0) return true;

            return allowedTypes.includes(extension);
        }, [settings.allowedFormats]);

        // Process content based on settings
        const processFileContent = useCallback((content) => {
            let processedContent = content;

            if (settings.removeComments) {
                processedContent = processedContent
                    .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1') // Remove C-style comments
                    .replace(/^\s*#.*$/gm, '')                           // Remove shell/python style comments
                    .replace(/^\s*--.*$/gm, '')                         // Remove SQL style comments
                    .replace(/^\s*\n/gm, '')                           // Remove empty lines
                    .trim();
            }

            if (settings.minifyCode) {
                processedContent = processedContent
                    .replace(/\s+/g, ' ')
                    .replace(/\n/g, '')
                    .trim();
            }

            return processedContent;
        }, [settings.removeComments, settings.minifyCode]);

        // API interaction functions
        const fetchRepoContents = async (owner, repo, branch = null, basePath = '') => {
            try {
                const headers = {
                    'Accept': 'application/vnd.github.v3+json'
                };

                if (formState.token) {
                    headers.Authorization = `token ${formState.token}`;
                }

                abortControllerRef.current = new AbortController();
                const { signal } = abortControllerRef.current;

                // Fetch repository metadata
                const repoResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}`,
                    { headers, signal }
                );

                if (!repoResponse.ok) {
                    throw new Error(repoResponse.status === 404 ? 'Repository not found' : 'Failed to fetch repository');
                }

                const repoData = await repoResponse.json();
                const targetBranch = branch || repoData.default_branch;

                // Fetch the tree
                const treeResponse = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
                    { headers, signal }
                );

                if (!treeResponse.ok) {
                    throw new Error('Failed to fetch repository contents');
                }

                const treeData = await treeResponse.json();

                // Filter and process files
                const files = treeData.tree
                    .filter(item => item.type === 'blob')
                    .filter(item => !basePath || item.path.startsWith(basePath))
                    .filter(item => !shouldSkipEntry(item.path))
                    .filter(item => isAllowedFileType(item.path));

                setFormState(prev => ({
                    ...prev,
                    progress: { processed: 0, total: files.length }
                }));

                let combinedContent = '';
                let processedFiles = 0;
                let totalSize = 0;
                let currentTokens = 0;

                for (const file of files) {
                    if (signal.aborted) {
                        throw new Error('Operation cancelled');
                    }

                    try {
                        const contentResponse = await fetch(
                            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${targetBranch}`,
                            { headers, signal }
                        );

                        if (!contentResponse.ok) continue;

                        const contentData = await contentResponse.json();
                        let content = atob(contentData.content);

                        // Apply processing based on settings
                        content = processFileContent(content);

                        // Check token limit
                        const contentTokens = Math.ceil(content.length / 4);
                        if (settings.tokenLimit > 0 && currentTokens + contentTokens > settings.tokenLimit) {
                            console.warn(`Token limit (${settings.tokenLimit}) reached`);
                            break;
                        }

                        combinedContent += `\n\n// File: ${file.path}\n${content}`;
                        processedFiles++;
                        totalSize += content.length;
                        currentTokens += contentTokens;

                        setFormState(prev => ({
                            ...prev,
                            progress: { processed: processedFiles, total: files.length }
                        }));

                        // Add small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 50));

                    } catch (error) {
                        if (error.message === 'Operation cancelled') throw error;
                        console.warn(`Error processing ${file.path}:`, error);
                    }
                }

                return {
                    content: combinedContent.trim(),
                    fileCount: processedFiles,
                    totalSize,
                    tokenCount: currentTokens
                };

            } catch (error) {
                if (signal?.aborted) {
                    throw new Error('Operation cancelled by user');
                }
                throw error;
            }
        };

        // Input handlers
        const handleUrlChange = useCallback((e) => {
            e.preventDefault();
            setFormState(prev => ({
                ...prev,
                url: e.target.value
            }));
        }, []);

        const handleTokenChange = useCallback((e) => {
            e.preventDefault();
            setFormState(prev => ({
                ...prev,
                token: e.target.value
            }));
        }, []);

        const toggleHelp = useCallback((e) => {
            e.preventDefault();
            setFormState(prev => ({
                ...prev,
                help: !prev.help
            }));
        }, []);

        // Validation
        const validateGitHubUrl = useCallback((url) => {
            const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\/tree\/[^/]+(?:\/[\w.-]+)*)?$/;
            return githubRegex.test(url);
        }, []);

        const extractRepoInfo = useCallback((url) => {
            const match = url.match(/github\.com\/([\w-]+)\/([\w.-]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?/);
            return match ? {
                owner: match[1],
                repo: match[2],
                branch: match[3] || null,
                path: match[4] || ''
            } : null;
        }, []);

        // Form submission
        const handleSubmit = useCallback(async (e) => {
            e.preventDefault();

            setFormState(prev => ({
                ...prev,
                error: '',
                progress: { processed: 0, total: 0 }
            }));

            if (!validateGitHubUrl(formState.url)) {
                setFormState(prev => ({
                    ...prev,
                    error: 'Please enter a valid GitHub repository URL'
                }));
                return;
            }

            const repoInfo = extractRepoInfo(formState.url);
            if (!repoInfo) {
                setFormState(prev => ({
                    ...prev,
                    error: 'Invalid GitHub repository URL format'
                }));
                return;
            }

            try {
                onProcess(true);
                const result = await fetchRepoContents(
                    repoInfo.owner,
                    repoInfo.repo,
                    repoInfo.branch,
                    repoInfo.path
                );
                onProcess(false, result);
            } catch (error) {
                if (error.message !== 'Operation cancelled by user') {
                    setFormState(prev => ({
                        ...prev,
                        error: error.message
                    }));
                }
                onProcess(false);
            }
        }, [formState.url, formState.token, onProcess, validateGitHubUrl, extractRepoInfo, fetchRepoContents]);

        // Cancel operation
        const handleCancel = useCallback(() => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
                onProcess(false);
                setFormState(prev => ({
                    ...prev,
                    progress: { processed: 0, total: 0 }
                }));
            }
        }, [onProcess]);

        // Component render
        return (
            <div className="mb-8">
                {formState.help && (
                    <div className="flex items-start gap-2 my-3">
                        <div className="flex-1 p-4 bg-purple-100 rounded-xl">
                            <h4 className="text-lg text-purple-600">GitHub Personal Access Token</h4>
                            <p className="text-sm text-purple-900 mt-1">
                                Optional token for private repositories and/or increased API rate limits
                            </p>
                            <a
                                href="https://github.com/settings/tokens/new?description=sac&scopes=repo"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-white mt-5 hover:bg-purple-200 rounded-lg transition-colors"
                            >
                                Generate Token
                                <ArrowUpRight className="w-4 h-4 ml-1" />
                            </a>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Github className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formState.url}
                                    onChange={handleUrlChange}
                                    disabled={processing}
                                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter GitHub repository URL"
                                />
                            </div>

                            <div className="relative flex-1 flex">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Github className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formState.token}
                                    onChange={handleTokenChange}
                                    disabled={processing}
                                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="GitHub Personal Access Token (optional)"
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        // Save both URL and token to settings
                                        updateSettings({
                                            githubToken: formState.token,
                                            githubUrl: formState.url
                                        });
                                        setIsSaved(true)
                                        setTimeout(() => {
                                            setIsSaved(false)
                                        }, 1000)
                                    }}
                                    className="text-md -mt-0.5 font-bold text-green-500 px-1 py-0.5 rounded min-w-[30px] ms-2"
                                >
                                    {isSaved ? <CheckCheck /> : <SaveIcon />}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleHelp}
                                    className="text-md -mt-0.5 font-bold text-purple-500 px-1 py-0.5 rounded min-w-[30px]"
                                >
                                    <Info />
                                </button>
                            </div>

                            {processing ? (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-6 py-3 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <X className="w-5 h-5" />
                                        <span>Stop</span>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!formState.url}
                                    className={`px-6 py-3 rounded-xl font-medium transition-colors ${!formState.url
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    Process
                                </button>
                            )}
                        </div>
                    </div>

                    {formState.error && (
                        <div className="text-red-600 text-sm mt-2">
                            {formState.error}
                        </div>
                    )}
                    {processing && formState.progress.total > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Processing files: {formState.progress.processed}/{formState.progress.total}</span>
                        </div>
                    )}
                </form>
            </div>
        );
    };

    // Update the token-aware content display
    const ContentEditor = () => {
        const [editableContent, setEditableContent] = useState(content);
        const textareaRef = useRef<HTMLTextAreaElement>(null);

        // Update token count when content changes
        useEffect(() => {
            const count = estimateTokenCount(editableContent);
            setCurrentTokens(count);
            setContent(editableContent);
        }, [editableContent]);

        const getTokenMessage = (): { text: string; isWarning: boolean } => {
            if (!tokenLimit || tokenLimit === -1) {
                return {
                    text: `Total Tokens: ${currentTokens.toLocaleString()}`,
                    isWarning: false
                };
            }

            const exceededBy = currentTokens - tokenLimit;
            if (exceededBy > 0) {
                return {
                    text: `Exceeds limit by ${exceededBy.toLocaleString()} tokens (${currentTokens.toLocaleString()}/${tokenLimit.toLocaleString()})`,
                    isWarning: true
                };
            }

            return {
                text: `${currentTokens.toLocaleString()} / ${tokenLimit === -1 ? "Unlimited" : tokenLimit.toLocaleString()} tokens`,
                isWarning: false
            };
        };

        const tokenMessage = getTokenMessage();

        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-lg">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                Processed {fileCount} files • {(totalSize / 1024).toFixed(1)}KB
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`text-sm ${tokenMessage.isWarning ? 'text-amber-600 font-medium' : 'text-gray-600'
                                }`}>
                                {tokenMessage.text}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setEditableContent('');
                                        setContent('');
                                        setFileCount(0);
                                        setTotalSize(0);
                                        setCurrentTokens(0);
                                        setError(null);
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                                    aria-label="Clear content"
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
                    </div>
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={editableContent}
                            onChange={(e) => setEditableContent(e.target.value)}
                            className="w-full p-4 text-sm font-mono bg-gray-50 focus:bg-white transition-colors duration-200 focus:outline-none min-h-[300px] max-h-[70vh] overflow-y-auto"
                            spellCheck={false}
                            style={{
                                resize: 'vertical',
                                lineHeight: '1.5',
                                tabSize: 2
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Update settings when token limit changes
    const handleTokenLimitChange = (value: number) => {
        const newLimit = value || -1;
        setTokenLimit(newLimit);
        updateSettings({ tokenLimit: newLimit });
    };

    const renderAdvancedSettings = () => (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-6 mt-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Advanced Settings</h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleResetSettings}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Reset to Default
                    </button>
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        {showAdvanced ? <ChevronUp /> : <ChevronDown />}
                    </button>
                </div>
            </div>
            {/* Token Limit */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Token Limit
                </label>
                <div className="space-y-2">
                    <input
                        type="number"
                        value={tokenLimit}
                        onChange={(e) => handleTokenLimitChange(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter token limit (-1 for unlimited)"
                        min="-1"
                    />
                    <p className="text-sm text-gray-500">
                        Set to -1 for unlimited tokens. Current token count: {currentTokens}
                    </p>
                </div>
            </div>

            {/* Code Processing Options */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code Processing
                </label>
                <div className="space-y-2">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={settings.removeComments}
                            onChange={(e) => updateSettings({
                                removeComments: e.target.checked
                            })}
                            className="rounded border-gray-300"
                        />
                        <span>Remove Comments</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={settings.minifyCode}
                            onChange={(e) => updateSettings({
                                minifyCode: e.target.checked
                            })}
                            className="rounded border-gray-300"
                        />
                        <span>Minify Code</span>
                    </label>
                </div>
            </div>

            {/* Exclude Patterns */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exclude Patterns
                </label>
                <div className="space-y-2">
                    {settings.excludePatterns.map((pattern, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={pattern}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                            <button
                                onClick={() => {
                                    const newPatterns = settings.excludePatterns.filter((_, i) => i !== index);
                                    updateSettings({ excludePatterns: newPatterns });
                                }}
                                className="p-2 text-red-500 hover:text-red-700"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newPattern}
                            onChange={(e) => setNewPattern(e.target.value)}
                            placeholder="Add new pattern (e.g., /xcache)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && newPattern) {
                                    updateSettings({
                                        excludePatterns: [...settings.excludePatterns, newPattern]
                                    });
                                    setNewPattern('');
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                if (newPattern) {
                                    updateSettings({
                                        excludePatterns: [...settings.excludePatterns, newPattern]
                                    });
                                    setNewPattern('');
                                }
                            }}
                            className="p-2 text-blue-500 hover:text-blue-700"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Allowed File Formats */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed File Formats
                </label>
                <textarea
                    value={settings.allowedFormats}
                    onChange={(e) => updateSettings({
                        allowedFormats: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 font-mono"
                    placeholder=".js&#10;.py&#10;.rb"
                />
                <p className="mt-1 text-sm text-gray-500">
                    One file extension per line (e.g., .js, .py, .rb)
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-900">
            <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href="/" className="flex hover:scale-105 hover:-rotate-1 transform transition duration-1 cursor-pointer items-center gap-2">
                        <BotIcon className="w-6 h-6 text-blue-600" />
                        <span className="font-bold text-xl">SAC</span>
                        <span className="text-gray-500">by Pinn.co</span>
                    </a>
                    <div className="flex items-center gap-4">
                        <a
                            href="https://luw.ai/?utm_source=Pinnco"
                            target="_blank"
                            rel="noopener"
                            className="hidden md:flex items-center gap-2 text-lg text-blue-600 hover:text-gray-900 transition-colors"
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
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-16">
                {/* Hero section - only show when not processing */}
                {!generating && !processing && (
                    <div className="text-center mb-12">
                        <h1 className="text-6xl max-w-3xl mx-auto font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            Streamlined AI Context
                        </h1>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Transform your codebase into an optimized AI-friendly format.
                            Seamlessly integrate your entire project context with AI tools like Claude and ChatGPT.
                        </p>
                    </div>
                )}

                {/* Loading State */}
                {(generating || processing) && (
                    <div className="text-center mt-6 py-12">
                        <div className="flex flex-col justify-center items-center text-gray-600 max-w-3xl mx-auto">
                            <div className="relative mb-4">
                                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                            <span className="text-xl mb-2">Processing your files...</span>
                            {fileCount > 0 && (
                                <span className="text-sm text-gray-500">
                                    Processed {fileCount} files ({(totalSize / 1024).toFixed(1)}KB)
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && !generating && !processing && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
                        {error}
                    </div>
                )}

                {/* Content Editor - Replace your existing content display with this */}
                {!generating && !processing && content && <ContentEditor />}

                {/* Drop Zone and Advanced Settings */}
                {!generating && !processing && !content && (
                    <>
                        <div
                            className={`
                            relative rounded-xl border-2 border-dashed p-12 mb-8 transition-all
                            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                            bg-white shadow-lg hover:border-blue-500
                        `}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            aria-label="Drop zone for project files"
                        >
                            <div className="flex flex-col items-center justify-center text-center">
                                <FolderOpen
                                    className={`w-16 h-16 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
                                />
                                <div className="mb-2 text-2xl font-medium">
                                    Drop Your Project Files
                                </div>
                                <div className="text-gray-500">
                                    Supports all major programming languages
                                </div>
                                {fileCount > 0 && (
                                    <div className="mt-4 text-sm text-gray-500">
                                        {fileCount} files processed • {(totalSize / 1024).toFixed(1)}KB
                                    </div>
                                )}
                            </div>
                        </div>


                        <div className="mb-8">
                            <GitHubInput
                                onProcess={handleGitHubProcess}
                                processing={processing || generating}
                                settings={settings}
                                updateSettings={updateSettings}
                            />
                        </div>

                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 p-4 bg-white rounded-xl border border-gray-200 shadow-lg hover:bg-gray-50 transition-colors"
                            aria-expanded={showAdvanced}
                        >
                            <Settings className="w-4 h-4" />
                            <span>Advanced Settings</span>
                            <span className="ml-1 text-xs -mt-0.5 font-bold bg-purple-100 text-purple-500 px-1.5 py-0.5 rounded">
                                New feature!
                            </span>
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showAdvanced && renderAdvancedSettings()}

                        {/* Feature Grid */}
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
                    </>
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