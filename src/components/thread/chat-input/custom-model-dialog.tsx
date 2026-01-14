'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface CustomModelFormData {
    id: string;
    label: string;
}

interface CustomModelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (modelData: CustomModelFormData) => void;
    initialData: CustomModelFormData;
    mode: 'add' | 'edit';
}

export const CustomModelDialog: React.FC<CustomModelDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    mode,
}) => {
    const [formData, setFormData] = React.useState<CustomModelFormData>(initialData);

    // Reset form data when dialog opens with new initialData
    React.useEffect(() => {
        setFormData(initialData);
    }, [initialData, isOpen]);

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (formData.id.trim()) {
            onSave(formData);
        }
    };

    const handleClose = () => {
        onClose();
    };

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id === 'modelId' ? 'id' : 'label']: value
        }));
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    handleClose();
                }
            }}
        >
            <DialogContent
                className="sm:max-w-[430px]"
                onEscapeKeyDown={handleClose}
                onPointerDownOutside={handleClose}
            >
                <DialogHeader>
                    <DialogTitle>{mode === 'add' ? '添加自定义模型' : '编辑自定义模型'}</DialogTitle>
                    <DialogDescription>
                        Kortix 在内部使用 <b>LiteLLM</b>，兼容 100+ 种模型。你可以通过在模型前加上 <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">openrouter/</code> 前缀来快速使用任意 <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline">OpenRouter 模型</a>。如果想使用非 OpenRouter 的其他模型，可能需要修改 <a href="https://github.com/kortix-ai/suna/blob/main/backend/core/services/llm.py" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline">llm.py</a>，设置相应的环境变量并重构自托管 Docker 镜像。
                    </DialogDescription>



                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex flex-col items-start gap-4">
                        <Label htmlFor="modelId" className="text-right">
                            模型 ID
                        </Label>
                        <Input
                            id="modelId"
                            placeholder="例如 openrouter/meta-llama/llama-4-maverick"
                            value={formData.id}
                            onChange={handleChange}
                            className="col-span-3"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleClose();
                    }}>
                        取消
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!formData.id.trim()}
                    >
                        {mode === 'add' ? '添加模型' : '保存更改'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}; 