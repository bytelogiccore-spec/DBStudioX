import React from 'react';
import styles from './BlobViewerModal.module.css';
import { X, Copy, Download } from 'lucide-react';

interface BlobViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        type: string;
        value: number[];
    };
    columnName: string;
}

const BlobViewerModal: React.FC<BlobViewerModalProps> = ({ isOpen, onClose, data, columnName }) => {
    if (!isOpen) return null;

    const hexString = data.value.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const textString = new TextDecoder().decode(new Uint8Array(data.value));

    const handleCopyHex = () => {
        navigator.clipboard.writeText(hexString);
    };

    const handleCopyText = () => {
        navigator.clipboard.writeText(textString);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>BLOB Content: {columnName}</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className={styles.content}>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span>Hex View ({data.value.length} bytes)</span>
                            <button onClick={handleCopyHex} title="Copy Hex">
                                <Copy size={14} />
                            </button>
                        </div>
                        <div className={styles.hexBody}>
                            {hexString}
                        </div>
                    </div>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span>Text View (UTF-8)</span>
                            <button onClick={handleCopyText} title="Copy Text">
                                <Copy size={14} />
                            </button>
                        </div>
                        <div className={styles.textBody}>
                            {textString}
                        </div>
                    </div>
                </div>
                <div className={styles.footer}>
                    <button className={styles.downloadButton}>
                        <Download size={16} />
                        Download Raw Data
                    </button>
                    <button className={styles.doneButton} onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BlobViewerModal;
