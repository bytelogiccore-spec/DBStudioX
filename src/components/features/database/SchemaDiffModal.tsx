import React, { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDatabaseStore } from '@/stores/databaseStore';
import { dbService } from '@/services/dbService';
import { DiffEditor } from '@monaco-editor/react';
import { FileSearch, ChevronRight, CheckCircle2, History, AlertCircle, FileCode } from 'lucide-react';
import FileDialog from '@/components/ui/FileDialog';
import { useFileDialog, FILE_FILTERS } from '@/hooks/useFileDialog';
import styles from './SchemaDiffModal.module.css';

const SchemaDiffModal: React.FC = () => {
    const { activeModal, closeModal, addNotification } = useUIStore();
    const { activeConnection } = useDatabaseStore();
    const isOpen = activeModal === 'schema-diff';

    const [step, setStep] = useState(1);
    const [targetFile, setTargetFile] = useState<string | null>(null);
    const [diffResult, setDiffResult] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSql, setShowSql] = useState(false);

    // Custom file dialog
    const fileDialog = useFileDialog();

    const handleFileSelect = async () => {
        const file = await fileDialog.openFile({
            filters: FILE_FILTERS.database,
            title: 'Select Database to Compare'
        });
        if (file) setTargetFile(file);
    };

    const handleNext = async () => {
        if (step === 2 && targetFile && activeConnection) {
            setIsProcessing(true);
            try {
                const result = await dbService.diffSchemas(activeConnection.id, targetFile);
                setDiffResult(result);
                setStep(3);
            } catch (error: any) {
                addNotification({
                    type: 'error',
                    title: 'Comparison Failed',
                    message: error.toString()
                });
            } finally {
                setIsProcessing(false);
            }
        } else {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const getAllSql = () => {
        if (!diffResult) return "";
        return [
            "-- Tables to Create",
            ...diffResult.tablesToCreate,
            "",
            "-- Columns to Add",
            ...diffResult.columnsToAdd,
            "",
            "-- Indexes to Create",
            ...diffResult.indexesToCreate,
            "",
            "-- Tables to Drop",
            ...diffResult.tablesToDrop,
        ].join("\n");
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeModal}
            title="Schema Diff (Database Comparison)"
            size={step === 3 ? "xl" : "lg"}
            footer={
                <div className={styles.footer}>
                    {step > 1 && (
                        <Button variant="secondary" onClick={handleBack} disabled={isProcessing}>
                            Back
                        </Button>
                    )}
                    <div className={styles.spacer} />
                    {step < 3 ? (
                        <Button variant="primary" onClick={handleNext} disabled={!targetFile && step === 2} isLoading={isProcessing}>
                            Next <ChevronRight size={16} className="ml-2" />
                        </Button>
                    ) : (
                        <Button variant="primary" onClick={closeModal}>
                            Close <CheckCircle2 size={16} className="ml-2" />
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
                        <span>Intro</span>
                    </div>
                    <div className={styles.line} />
                    <div className={`${styles.step} ${step >= 2 ? styles.active : ''}`}>
                        <div className={styles.stepIcon}>2</div>
                        <span>Target</span>
                    </div>
                    <div className={styles.line} />
                    <div className={`${styles.step} ${step >= 3 ? styles.active : ''}`}>
                        <div className={styles.stepIcon}>3</div>
                        <span>Results</span>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {step === 1 && (
                        <div className={styles.intro}>
                            <div className={styles.introCard}>
                                <FileSearch size={48} className="mb-4 text-brand-primary" />
                                <h3>Compare Schemas</h3>
                                <p>Analyze structural differences between your current database and another SQLite file.</p>
                                <ul className={styles.featureList}>
                                    <li>Identify missing tables and columns</li>
                                    <li>Detection of index discrepancies</li>
                                    <li>Generate migration SQL scripts</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className={styles.configForm}>
                            <div className="mb-6">
                                <label className={styles.label}>Compare Current Database With:</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={targetFile || ''}
                                        readOnly
                                        placeholder="Select target SQLite file..."
                                        className="flex-1"
                                    />
                                    <Button variant="secondary" onClick={handleFileSelect}>
                                        Browse
                                    </Button>
                                </div>
                            </div>
                            <div className={styles.infoBox}>
                                <AlertCircle size={20} className="mr-2" />
                                <span>The source will be <b>{activeConnection?.name}</b>. The target will be the selected file.</span>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className={styles.results}>
                            <div className={styles.summaryGrid}>
                                <div className={styles.summaryCard}>
                                    <span className={styles.count}>{diffResult?.tablesToCreate.length || 0}</span>
                                    <span className={styles.label}>Tables to Add</span>
                                </div>
                                <div className={styles.summaryCard}>
                                    <span className={styles.count}>{diffResult?.columnsToAdd.length || 0}</span>
                                    <span className={styles.label}>Columns to Add</span>
                                </div>
                                <div className={styles.summaryCard}>
                                    <span className={styles.count}>{diffResult?.indexesToCreate.length || 0}</span>
                                    <span className={styles.label}>Indexes to Create</span>
                                </div>
                            </div>

                            <div className={styles.sqlPreview}>
                                <div className={styles.previewHeader}>
                                    <span className={styles.previewTitle}><FileCode size={16} className="mr-2" /> Migration SQL Preview</span>
                                    <Button size="sm" variant="ghost" onClick={() => setShowSql(!showSql)}>
                                        {showSql ? "Hide SQL" : "Show SQL"}
                                    </Button>
                                </div>
                                {showSql && (
                                    <div className={styles.editorContainer}>
                                        <DiffEditor
                                            height="300px"
                                            language="sql"
                                            theme="vs-dark"
                                            original="-- Current schema (No changes shown in this simple diff version)"
                                            modified={getAllSql()}
                                            options={{
                                                renderSideBySide: false,
                                                readOnly: true,
                                                minimap: { enabled: false }
                                            }}
                                        />
                                    </div>
                                )}
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
            />
        </Modal>
    );
};

export default SchemaDiffModal;
