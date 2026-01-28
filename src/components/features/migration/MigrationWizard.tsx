import React, { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { useDatabaseStore } from '@/stores/databaseStore';
import { importData, exportData } from '@/lib/tauri';
import { FileIcon, UploadCloud, DownloadCloud, ChevronRight, CheckCircle2 } from 'lucide-react';
import FileDialog from '@/components/ui/FileDialog';
import { useFileDialog, FILE_FILTERS } from '@/hooks/useFileDialog';
import styles from './MigrationWizard.module.css';

type MigrationMode = 'import' | 'export';
type ImportFormat = 'csv' | 'json' | 'sql';
type ExportFormat = 'csv' | 'json' | 'sql';

const MigrationWizard: React.FC = () => {
    const { activeModal, closeModal, addNotification } = useUIStore();
    const { activeConnection } = useDatabaseStore();
    const isOpen = activeModal === 'migration-wizard';

    const [mode, setMode] = useState<MigrationMode>('import');
    const [step, setStep] = useState(1);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [format, setFormat] = useState<ImportFormat | ExportFormat>('csv');
    const [targetTable, setTargetTable] = useState('');

    // Custom file dialog
    const fileDialog = useFileDialog();

    const handleFileSelect = async () => {
        if (mode === 'import') {
            const file = await fileDialog.openFile({
                filters: format === 'csv' ? FILE_FILTERS.csv : format === 'json' ? FILE_FILTERS.json : FILE_FILTERS.sql,
                title: `Import ${format.toUpperCase()} File`
            });
            if (file) setSelectedFile(file);
        } else {
            const file = await fileDialog.saveFile({
                filters: format === 'csv' ? FILE_FILTERS.csv : format === 'json' ? FILE_FILTERS.json : FILE_FILTERS.sql,
                title: `Export ${format.toUpperCase()} File`,
                defaultFileName: `${targetTable || 'export'}.${format}`
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
        if (!selectedFile || !targetTable || !activeConnection) {
            addNotification({ type: 'warning', title: 'Missing Information', message: 'Please complete all fields.' });
            return;
        }

        try {
            let result;
            if (mode === 'import') {
                result = await importData(activeConnection.id, targetTable, selectedFile, format);
            } else {
                result = await exportData(activeConnection.id, targetTable, selectedFile, format);
            }

            addNotification({
                type: 'success',
                title: 'Migration Completed',
                message: result.message
            });
            closeModal();
            setStep(1);
            setSelectedFile(null);
        } catch (error: any) {
            addNotification({
                type: 'error',
                title: 'Migration Failed',
                message: error.toString()
            });
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeModal}
            title={mode === 'import' ? 'Data Import Wizard' : 'Data Export Wizard'}
            size="lg"
            footer={
                <div className={styles.footer}>
                    {step > 1 && (
                        <Button variant="secondary" onClick={handleBack}>
                            Back
                        </Button>
                    )}
                    <div className={styles.spacer} />
                    {step < 3 ? (
                        <Button variant="primary" onClick={handleNext} disabled={!selectedFile && step === 2}>
                            Next <ChevronRight size={16} className="ml-2" />
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={handleFinish}>
                            Finish <CheckCircle2 size={16} className="ml-2" />
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
                        <span>Config</span>
                    </div>
                    <div className={styles.line} />
                    <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
                        <div className={styles.stepIcon}>3</div>
                        <span>Review</span>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {step === 1 && (
                        <div className={styles.modeSelection}>
                            <button
                                className={`${styles.modeCard} ${mode === 'import' ? styles.selected : ''}`}
                                onClick={() => setMode('import')}
                            >
                                <UploadCloud size={48} className="mb-4 text-brand-primary" />
                                <h3>Import Data</h3>
                                <p>Load data from CSV, JSON, or SQL files into a table.</p>
                            </button>
                            <button
                                className={`${styles.modeCard} ${mode === 'export' ? styles.selected : ''}`}
                                onClick={() => setMode('export')}
                            >
                                <DownloadCloud size={48} className="mb-4 text-brand-secondary" />
                                <h3>Export Data</h3>
                                <p>Save table data to CSV, JSON, or SQL file.</p>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className={styles.configForm}>
                            <div className="mb-6">
                                <label className={styles.label}>Source File</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={selectedFile || ''}
                                        readOnly
                                        placeholder="Select a file..."
                                        className="flex-1"
                                    />
                                    <Button variant="secondary" onClick={handleFileSelect}>
                                        Browse
                                    </Button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className={styles.label}>{mode === 'import' ? 'Target Table' : 'Source Table'}</label>
                                <Input
                                    value={targetTable}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetTable(e.target.value)}
                                    placeholder="Enter table name..."
                                />
                            </div>

                            <div className="mb-6">
                                <label className={styles.label}>Format</label>
                                <Select
                                    value={format}
                                    onChange={(v: any) => {
                                        setFormat(v);
                                        setSelectedFile(null); // Reset file selection when format changes
                                    }}
                                    options={[
                                        { value: 'csv', label: 'CSV (Comma Separated Values)' },
                                        { value: 'json', label: 'JSON (JavaScript Object Notation)' },
                                        { value: 'sql', label: 'SQL (Insert Statements)' },
                                    ]}
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className={styles.review}>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Operation</span>
                                <span className={styles.summaryValue}>{mode.toUpperCase()}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>File</span>
                                <span className={styles.summaryValue}>{selectedFile}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Table</span>
                                <span className={styles.summaryValue}>{targetTable}</span>
                            </div>
                            <div className={styles.summaryItem}>
                                <span className={styles.summaryLabel}>Format</span>
                                <span className={styles.summaryValue}>{format.toUpperCase()}</span>
                            </div>

                            <div className={styles.waitMessage}>
                                <FileIcon size={24} className="mr-2 animate-pulse" />
                                Ready to start migration...
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

export default MigrationWizard;
