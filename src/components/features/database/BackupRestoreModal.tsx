import React, { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDatabaseStore } from '@/stores/databaseStore';
import { dbService } from '@/services/dbService';
import { Database, ShieldCheck, ShieldAlert, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import FileDialog from '@/components/ui/FileDialog';
import { useFileDialog, FILE_FILTERS } from '@/hooks/useFileDialog';
import styles from './BackupRestoreModal.module.css';

type Mode = 'backup' | 'restore';

const BackupRestoreModal: React.FC = () => {
    const { activeModal, closeModal, addNotification, triggerSchemaRefresh } = useUIStore();
    const { activeConnection } = useDatabaseStore();
    const isOpen = activeModal === 'backup-restore';

    const [mode, setMode] = useState<Mode>('backup');
    const [step, setStep] = useState(1);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Custom file dialog
    const fileDialog = useFileDialog();

    const handleFileSelect = async () => {
        if (mode === 'restore') {
            const file = await fileDialog.openFile({
                filters: FILE_FILTERS.database,
                title: 'Select Backup File'
            });
            if (file) setSelectedFile(file);
        } else {
            const file = await fileDialog.saveFile({
                filters: FILE_FILTERS.database,
                title: 'Save Backup File',
                defaultFileName: `${activeConnection?.name || 'backup'}_${new Date().toISOString().split('T')[0]}.db`
            });
            if (file) setSelectedFile(file);
        }
    };

    const handleNext = () => {
        setStep(prev => prev + 1);
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleFinish = async () => {
        if (!selectedFile || !activeConnection) {
            addNotification({ type: 'warning', title: 'Missing Information', message: 'Please select a file.' });
            return;
        }

        setIsProcessing(true);
        try {
            if (mode === 'backup') {
                await dbService.backup(activeConnection.id, selectedFile);
                addNotification({
                    type: 'success',
                    title: 'Backup Completed',
                    message: `Database backed up to ${selectedFile}`
                });
            } else {
                await dbService.restore(activeConnection.id, selectedFile);
                addNotification({
                    type: 'success',
                    title: 'Restore Completed',
                    message: `Database restored from ${selectedFile}`
                });
                triggerSchemaRefresh(); // Refresh schema in case it changed
            }
            closeModal();
            setStep(1);
            setSelectedFile(null);
        } catch (error: any) {
            addNotification({
                type: 'error',
                title: `${mode === 'backup' ? 'Backup' : 'Restore'} Failed`,
                message: error.toString()
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeModal}
            title={mode === 'backup' ? 'Database Backup' : 'Database Restore'}
            size="lg"
            footer={
                <div className={styles.footer}>
                    {step > 1 && (
                        <Button variant="secondary" onClick={handleBack} disabled={isProcessing}>
                            Back
                        </Button>
                    )}
                    <div className={styles.spacer} />
                    {step < 3 ? (
                        <Button variant="primary" onClick={handleNext} disabled={!selectedFile && step === 2}>
                            Next <ChevronRight size={16} className="ml-2" />
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={handleFinish} isLoading={isProcessing}>
                            {mode === 'backup' ? 'Start Backup' : 'Start Restore'} <CheckCircle2 size={16} className="ml-2" />
                        </Button>
                    )}
                </div>
            }
        >
            <div className={styles.container}>
                {/* Step Indicator */}
                <div className={styles.steps}>
                    <div className={`${styles.step} ${step >= 1 ? styles.active : ''}`}>
                        <div className={styles.stepIcon}>1</div>
                        <span>Mode</span>
                    </div>
                    <div className={styles.line} />
                    <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
                        <div className={styles.stepIcon}>2</div>
                        <span>File</span>
                    </div>
                    <div className={styles.line} />
                    <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
                        <div className={styles.stepIcon}>3</div>
                        <span>Verify</span>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {step === 1 && (
                        <div className={styles.modeSelection}>
                            <button
                                className={`${styles.modeCard} ${mode === 'backup' ? styles.selected : ''}`}
                                onClick={() => setMode('backup')}
                            >
                                <ShieldCheck size={48} className="mb-4 text-brand-success" />
                                <h3>Safe Backup</h3>
                                <p>Create a point-in-time copy of your database. Safe to run while the database is in use.</p>
                            </button>
                            <button
                                className={`${styles.modeCard} ${mode === 'restore' ? styles.selected : ''}`}
                                onClick={() => setMode('restore')}
                            >
                                <ShieldAlert size={48} className="mb-4 text-brand-warning" />
                                <h3>Restore Data</h3>
                                <p>Replace the current database content with data from a backup file. <span className={styles.warningText}>Warning: Current data will be overwritten.</span></p>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className={styles.configForm}>
                            <div className="mb-6">
                                <label className={styles.label}>{mode === 'backup' ? 'Destination Path' : 'Source Backup File'}</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={selectedFile || ''}
                                        readOnly
                                        placeholder={mode === 'backup' ? "Select where to save..." : "Select backup file..."}
                                        className="flex-1"
                                    />
                                    <Button variant="secondary" onClick={handleFileSelect}>
                                        Browse
                                    </Button>
                                </div>
                            </div>

                            {mode === 'restore' && (
                                <div className={styles.warningBox}>
                                    <AlertCircle size={20} className="mr-2" />
                                    <span>Restoring will completely replace the current database content. This action cannot be undone.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className={styles.review}>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Operation</span>
                                <span className={styles.summaryValue}>{mode.toUpperCase()}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Database</span>
                                <span className={styles.summaryValue}>{activeConnection?.name}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Target File</span>
                                <span className={styles.summaryValue}>{selectedFile}</span>
                            </div>

                            <div className={styles.waitMessage}>
                                <Database size={24} className="mr-2 animate-pulse" />
                                Ready to proceed with {mode}...
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Custom File Dialog */}
            <FileDialog
                open={fileDialog.isOpen}
                mode={fileDialog.mode}
                onSelect={fileDialog.onSelect}
                onClose={fileDialog.onClose}
                title={fileDialog.options.title}
                filters={fileDialog.options.filters}
                defaultFileName={fileDialog.options.defaultFileName}
            />
        </Modal>
    );
};

export default BackupRestoreModal;
