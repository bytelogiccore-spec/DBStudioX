/**
 * FileDialog Component Export
 * 
 * A customizable, themeable file dialog component for Tauri applications.
 * 
 * @example Basic Usage
 * ```tsx
 * import { FileDialog, useFileDialog, FILE_FILTERS } from '@/components/ui/FileDialog';
 * 
 * function MyComponent() {
 *     const fileDialog = useFileDialog();
 * 
 *     const handleOpenFile = async () => {
 *         const path = await fileDialog.openFile({
 *             filters: FILE_FILTERS.database,
 *             title: 'Select Database'
 *         });
 *         if (path) {
 *             console.log('Selected:', path);
 *         }
 *     };
 * 
 *     return (
 *         <>
 *             <button onClick={handleOpenFile}>Open File</button>
 *             <FileDialog
 *                 open={fileDialog.isOpen}
 *                 mode={fileDialog.mode}
 *                 onSelect={fileDialog.onSelect}
 *                 onClose={fileDialog.onClose}
 *                 {...fileDialog.options}
 *             />
 *         </>
 *     );
 * }
 * ```
 * 
 * @example Customizing Styles
 * Override CSS variables in your global styles:
 * ```css
 * :root {
 *     --dialog-bg: rgba(30, 30, 40, 0.98);
 *     --dialog-border: rgba(100, 100, 255, 0.2);
 *     --brand-primary: #6366f1;
 * }
 * ```
 */

export { default as FileDialog } from './FileDialog';
export type { FileDialogProps, FileEntry, DriveInfo } from './FileDialog';
export { useFileDialog, FILE_FILTERS } from '../../hooks/useFileDialog';
export type { UseFileDialogOptions, UseFileDialogReturn } from '../../hooks/useFileDialog';
