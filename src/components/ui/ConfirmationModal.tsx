"use client";

import { motion, AnimatePresence } from "framer-motion";
import PrimaryButton from "./PrimaryButton";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "secondary" | "ghost";
  danger?: boolean;
  loading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "primary",
  danger = false,
  loading = false,
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {title}
                </h3>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {message}
                </p>
              </div>
              
              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3 justify-end">
                <PrimaryButton
                  onClick={onClose}
                  variant="secondary"
                  disabled={loading}
                  className="min-w-[100px]"
                >
                  {cancelText}
                </PrimaryButton>
                <PrimaryButton
                  onClick={handleConfirm}
                  variant={confirmVariant}
                  disabled={loading}
                  className={`min-w-[100px] ${
                    danger
                      ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 hover:border-rose-700"
                      : ""
                  }`}
                >
                  {loading ? "Processing..." : confirmText}
                </PrimaryButton>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

