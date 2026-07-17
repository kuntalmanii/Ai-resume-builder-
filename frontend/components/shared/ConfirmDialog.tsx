"use client";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true, // Default to true as it's meant for destructive actions
}: ConfirmDialogProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onConfirm={onConfirm}
      confirmText={confirmText}
      cancelText={cancelText}
      isDestructive={isDestructive}
    />
  );
}

export default ConfirmDialog;
