'use client';

import React, { useCallback, useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import SqlEditor from '@/components/editor/SqlEditor';
import ResultGrid from '@/components/grid/ResultGrid';
import { useQueryStore } from '@/stores/queryStore';
import { useDatabaseStore } from '@/stores/databaseStore';
import { useUIStore } from '@/stores/uiStore';
import { dbService } from '@/services/dbService';
import { SchemaInfo } from '@/schemas/query';
import { Play, RotateCcw, Download, Copy, Trash2, Plus, X, ChevronRight, ChevronLeft, AlertCircle, CheckCircle2, Clock, Database, FileText, ChevronDown } from 'lucide-react';
import styles from './page.module.css';

export default function Home() {
  const { activeConnection } = useDatabaseStore();
  const { schemaVersion, addNotification } = useUIStore();
  const {
    tabs,
    activeTabId,
    setActiveTab,
    addTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeTabsToRight,
    renameTab,
    updateTabContent,
    executeCurrentTab,
    exportActiveResult,
    resultPanelExpanded,
    toggleResultPanel,
    clearResult
  } = useQueryStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Table dropdown state
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false);

  // Schema state for IntelliSense
  const [schema, setSchema] = useState<SchemaInfo | null>(null);

  // Tab context menu state
  const [tabContextMenu, setTabContextMenu] = useState<{ visible: boolean; x: number; y: number; tabId: string | null }>({
    visible: false, x: 0, y: 0, tabId: null
  });

  // Rename tab state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTabId, setRenameTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Fetch tables when connection changes OR when schema is refreshed (schemaVersion changes)
  useEffect(() => {
    if (activeConnection) {
      dbService.getSchema(activeConnection.id).then((schema: SchemaInfo) => {
        setSchema(schema);
        const tableNames = schema.tables.map(t => t.name);
        setTables(tableNames);
        if (tableNames.length > 0 && !tableNames.includes(selectedTable)) {
          setSelectedTable(tableNames[0]);
        }
      }).catch(console.error);
    } else {
      setSchema(null);
      setTables([]);
      setSelectedTable('');
    }
  }, [activeConnection, schemaVersion]);

  const handleRunQuery = useCallback(async () => {
    if (!activeConnection) {
      addNotification({ type: 'warning', title: 'No Connection', message: 'Please connect to a database first.' });
      return;
    }
    await executeCurrentTab(activeConnection.id);
  }, [activeConnection, executeCurrentTab, addNotification]);

  const handleClear = useCallback(() => {
    if (activeTabId) {
      updateTabContent(activeTabId, '');
      clearResult();
    }
  }, [activeTabId, updateTabContent, clearResult]);

  // SQL Template Generator
  const generateSQL = useCallback(async (type: 'select' | 'insert' | 'update' | 'delete') => {
    if (!activeConnection || !selectedTable) return;

    try {
      const tableInfo = await dbService.getTableInfo(activeConnection.id, selectedTable);
      const columns = tableInfo?.columns || [];

      let sql = '';
      const colNames = columns.map((c: any) => c.name);
      const pkCol = columns.find((c: any) => c.primaryKey)?.name || colNames[0] || 'id';

      switch (type) {
        case 'select':
          sql = `SELECT ${colNames.join(', ') || '*'}\nFROM "${selectedTable}"\nWHERE 1=1\nLIMIT 100;`;
          break;
        case 'insert':
          const placeholders = colNames.map((n: string) => `'${n}_value'`).join(', ');
          sql = `INSERT INTO "${selectedTable}" (${colNames.join(', ')})\nVALUES (${placeholders});`;
          break;
        case 'update':
          const setClauses = colNames.filter((n: string) => n !== pkCol).map((n: string) => `    ${n} = '${n}_value'`).join(',\n');
          sql = `UPDATE "${selectedTable}"\nSET\n${setClauses}\nWHERE ${pkCol} = ?;`;
          break;
        case 'delete':
          sql = `DELETE FROM "${selectedTable}"\nWHERE ${pkCol} = ?;`;
          break;
      }

      addTab(`${type.toUpperCase()} ${selectedTable}`);
      const { activeTabId: newTabId } = useQueryStore.getState();
      if (newTabId) {
        updateTabContent(newTabId, sql);
      }
    } catch (e) {
      console.error('Failed to generate SQL:', e);
      addNotification({ type: 'error', title: 'SQL Generation Failed', message: `Failed to get table info: ${e}` });
    }
  }, [activeConnection, selectedTable, addTab, updateTabContent, addNotification]);

  const handleSaveGridChanges = useCallback(async (editorState: any) => {
    if (!activeConnection || !selectedTable) {
      addNotification({ type: 'warning', title: 'Cannot Save', message: 'No active table selected.' });
      return;
    }

    const { changes, deletedRowIndices, addedRows } = editorState;

    try {
      // 1. Get primary key info
      const tableInfo = await dbService.getTableInfo(activeConnection.id, selectedTable);
      const columns = tableInfo?.columns || [];
      const pkNames = columns.filter((c: any) => c.primaryKey).map((c: any) => c.name);

      if (pkNames.length === 0) {
        addNotification({ type: 'error', title: 'Save Failed', message: 'Table does not have a primary key. Editing is not supported without a primary key.' });
        return;
      }

      // 2. Start transaction
      const txId = await dbService.beginTransaction(activeConnection.id);

      try {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (!activeTab || !activeTab.result) return;

        // 3. Process Deletions
        for (const rowIndex of deletedRowIndices) {
          const rowData = activeTab.result.rows[rowIndex];
          const whereClauses = pkNames.map((pk: string, _idx: number) => {
            const pkColIdx = activeTab.result!.columns.findIndex(c => c.name === pk);
            const val = rowData[pkColIdx];
            return `"${pk}" = ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`;
          }).join(' AND ');

          await dbService.executeQuery(activeConnection.id, `DELETE FROM "${selectedTable}" WHERE ${whereClauses}`);
        }

        // 4. Process Updates
        const modifiedRows = new Set<number>();
        Object.keys(changes).forEach(key => {
          const [rowIndex] = key.split(':');
          modifiedRows.add(parseInt(rowIndex));
        });

        for (const rowIndex of modifiedRows) {
          if (deletedRowIndices.has(rowIndex)) continue; // Skip if also deleted

          const rowData = activeTab.result.rows[rowIndex];
          const updateClauses: string[] = [];

          // Find all changes for this row
          Object.entries(changes).forEach(([key, val]) => {
            const [rIdx, colId] = key.split(':');
            if (parseInt(rIdx) === rowIndex) {
              updateClauses.push(`"${colId}" = ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`);
            }
          });

          if (updateClauses.length > 0) {
            const whereClauses = pkNames.map((pk: string) => {
              const pkColIdx = activeTab.result!.columns.findIndex(c => c.name === pk);
              const val = rowData[pkColIdx];
              return `"${pk}" = ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`;
            }).join(' AND ');

            await dbService.executeQuery(activeConnection.id, `UPDATE "${selectedTable}" SET ${updateClauses.join(', ')} WHERE ${whereClauses}`);
          }
        }

        // 5. Process Additions
        // Note: addedRows logic in useDataEditor needs refinement to hold actual row data
        // For now, let's focus on UPDATE/DELETE as proof of concept

        // 6. Commit
        await dbService.commitTransaction(txId);
        addNotification({ type: 'success', title: 'Saved', message: 'Changes applied successfully.' });

        // Refresh grid
        await executeCurrentTab(activeConnection.id);
      } catch (e) {
        await dbService.rollbackTransaction(txId);
        throw e;
      }
    } catch (e) {
      console.error('Failed to save changes:', e);
      addNotification({ type: 'error', title: 'Save Failed', message: String(e) });
    }
  }, [activeConnection, selectedTable, tabs, activeTabId, addNotification, executeCurrentTab]);

  return (
    <MainLayout>
      <div className={styles.container} onClick={() => { setTabContextMenu(prev => ({ ...prev, visible: false })); setTableDropdownOpen(false); }}>
        {/* SQL Editor Tabs */}
        <div className={styles.tabBar}>
          {tabs.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTabContextMenu({ visible: true, x: e.clientX, y: e.clientY, tabId: tab.id });
              }}
              className={`${styles.tab} ${activeTabId === tab.id ? styles.activeTab : ''}`}
            >
              <div className={styles.tabContent}>
                <div className={`${styles.tabDot} ${activeTabId === tab.id ? styles.activeDot : ''}`} />
                <span className={styles.tabTitle}>{tab.title}</span>
              </div>
              {!tab.isPermanent && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={styles.closeTab}
                >
                  <X size={10} />
                </button>
              )}
              {activeTabId === tab.id && <div className={styles.tabIndicator} />}
            </div>
          ))}
          <button onClick={() => addTab()} className={styles.addTab}>
            <Plus size={18} />
          </button>
        </div>

        {/* Tab Context Menu */}
        {tabContextMenu.visible && tabContextMenu.tabId && (() => {
          const contextTab = tabs.find(t => t.id === tabContextMenu.tabId);
          return (
            <div
              className={styles.tabContextMenu}
              style={{ left: tabContextMenu.x, top: tabContextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => {
                // Save to Saved Scripts
                if (contextTab && contextTab.content) {
                  const savedScripts = JSON.parse(localStorage.getItem('dbstudiox_saved_scripts') || '[]');
                  const newScript = {
                    id: `script-${Date.now()}`,
                    name: contextTab.title,
                    content: contextTab.content,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };
                  localStorage.setItem('dbstudiox_saved_scripts', JSON.stringify([...savedScripts, newScript]));
                  addNotification({ type: 'success', title: 'Script Saved', message: `"${contextTab.title}" has been saved to your library.` });
                }
                setTabContextMenu(prev => ({ ...prev, visible: false }));
              }}>
                Save Script
              </button>
              <button onClick={() => {
                setRenameTabId(tabContextMenu.tabId);
                setRenameValue(contextTab?.title || '');
                setRenameModalOpen(true);
                setTabContextMenu(prev => ({ ...prev, visible: false }));
              }}>
                Rename Tab
              </button>
              <div className={styles.tabContextMenuDivider} />
              <button onClick={() => { closeTab(tabContextMenu.tabId!); setTabContextMenu(prev => ({ ...prev, visible: false })); }}>
                Close
              </button>
              <button onClick={() => { closeOtherTabs(tabContextMenu.tabId!); setTabContextMenu(prev => ({ ...prev, visible: false })); }}>
                Close Other Tabs
              </button>
              <button onClick={() => { closeTabsToRight(tabContextMenu.tabId!); setTabContextMenu(prev => ({ ...prev, visible: false })); }}>
                Close Tabs to the Right
              </button>
              <div className={styles.tabContextMenuDivider} />
              <button onClick={() => { closeAllTabs(); setTabContextMenu(prev => ({ ...prev, visible: false })); }}>
                Close All
              </button>
            </div>
          );
        })()}

        {/* Rename Tab Modal */}
        {renameModalOpen && renameTabId && (
          <div className={styles.renameModal} onClick={() => setRenameModalOpen(false)}>
            <div className={styles.renameModalContent} onClick={(e) => e.stopPropagation()}>
              <h3>Rename Tab</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    renameTab(renameTabId, renameValue);
                    setRenameModalOpen(false);
                  }
                }}
                autoFocus
              />
              <div className={styles.renameModalActions}>
                <button onClick={() => setRenameModalOpen(false)}>Cancel</button>
                <button onClick={() => { renameTab(renameTabId, renameValue); setRenameModalOpen(false); }}>
                  Rename
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Area - Horizontal Split */}
        <div className={styles.workspace}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <button
                onClick={handleRunQuery}
                disabled={activeTab?.isLoading || !activeConnection}
                className={styles.runButton}
              >
                <Play size={14} fill="currentColor" />
                RUN QUERY
              </button>

              <div className={styles.toolbarDivider} />

              <ToolbarButton icon={<RotateCcw size={14} />} label="Reset" onClick={() => activeTabId && updateTabContent(activeTabId, '')} />
              <ToolbarButton icon={<Copy size={14} />} label="Copy" onClick={() => navigator.clipboard.writeText(activeTab?.content || '')} />
              <ToolbarButton icon={<Trash2 size={14} />} label="Clear" onClick={handleClear} />

              {/* Table Selector + SQL Generation Buttons */}
              {activeConnection && tables.length > 0 && (
                <>
                  <div className={styles.toolbarDivider} />
                  <div className={styles.sqlGenGroup}>
                    {/* Table Dropdown */}
                    <div className={styles.tableDropdown}>
                      <button
                        className={styles.tableDropdownTrigger}
                        onClick={(e) => { e.stopPropagation(); setTableDropdownOpen(!tableDropdownOpen); }}
                      >
                        <Database size={12} />
                        <span>{selectedTable || 'Select Table'}</span>
                        <ChevronDown size={12} className={tableDropdownOpen ? styles.rotated : ''} />
                      </button>
                      {tableDropdownOpen && (
                        <div className={styles.tableDropdownMenu} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
                          {tables.map(table => (
                            <button
                              key={table}
                              className={`${styles.tableDropdownItem} ${table === selectedTable ? styles.selected : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTable(table);
                                setTableDropdownOpen(false);
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              {table}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SQL Buttons */}
                    <div className={styles.sqlButtons}>
                      <SqlGenButton label="SELECT" onClick={() => generateSQL('select')} disabled={!selectedTable} />
                      <SqlGenButton label="INSERT" onClick={() => generateSQL('insert')} disabled={!selectedTable} />
                      <SqlGenButton label="UPDATE" onClick={() => generateSQL('update')} disabled={!selectedTable} />
                      <SqlGenButton label="DELETE" onClick={() => generateSQL('delete')} disabled={!selectedTable} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Content - Left/Right Split */}
          <div className={styles.splitContainer}>
            {/* Editor + Status Panel */}
            <div className={styles.leftPanel}>
              {/* Monaco Editor */}
              <div className={styles.editorPane}>
                <SqlEditor
                  value={activeTab?.content || ''}
                  onChange={(val) => activeTabId && updateTabContent(activeTabId, val || '')}
                  onRun={handleRunQuery}
                  schema={schema}
                />
              </div>

              {/* Status/Info Panel */}
              <div className={styles.statusPanel}>
                {activeTab?.isLoading ? (
                  <div className={styles.statusLoading}>
                    <div className={styles.miniSpinner} />
                    <span>Executing query...</span>
                  </div>
                ) : activeTab?.error ? (
                  <div className={styles.statusError}>
                    <AlertCircle size={16} />
                    <div className={styles.statusContent}>
                      <span className={styles.statusTitle}>Error</span>
                      <span className={styles.statusMessage}>{activeTab.error}</span>
                    </div>
                  </div>
                ) : activeTab?.result ? (
                  <div className={styles.statusSuccess}>
                    <CheckCircle2 size={16} />
                    <div className={styles.statusContent}>
                      <span className={styles.statusTitle}>
                        Query executed successfully ({new Date().toLocaleString('sv-SE').replace('T', ' ')}) - {activeTab.result.executionTimeMs}ms
                      </span>
                      <div className={styles.statusStats}>
                        <span><Database size={12} /> {activeTab.result.rows?.length || 0} rows</span>
                        <span><Clock size={12} /> {activeTab.result.executionTimeMs}ms</span>
                        <span><FileText size={12} /> {activeTab.result.columns?.length || 0} columns</span>
                      </div>
                    </div>
                    {activeTab.result.rows && activeTab.result.rows.length > 0 && (
                      <button onClick={toggleResultPanel} className={styles.expandButton}>
                        {resultPanelExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        {resultPanelExpanded ? 'Hide' : 'Show'} Results
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={styles.statusIdle}>
                    <span>Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run query</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resizer */}
            {resultPanelExpanded && <div className={styles.resizer} />}

            {/* Result Grid - Right Panel (collapsible) */}
            {resultPanelExpanded && (
              <div className={styles.rightPanel}>
                <div className={styles.resultHeader}>
                  <div className={styles.resultInfo}>
                    <span className={styles.resultLabel}>Query Results</span>
                    {activeTab?.result && (
                      <span className={styles.resultStats}>
                        {activeTab.result.rows?.length || 0} rows • {activeTab.result.executionTimeMs}ms
                      </span>
                    )}
                  </div>
                  <div className={styles.resultActions}>
                    <div className={styles.exportGroup}>
                      <button className={styles.exportButton}>
                        <Download size={12} />
                        EXPORT
                      </button>
                      <div className={styles.exportDropdown}>
                        <button onClick={() => exportActiveResult('csv')} className={styles.exportItem}>CSV</button>
                        <button onClick={() => exportActiveResult('json')} className={styles.exportItem}>JSON</button>
                        <button onClick={() => exportActiveResult('sql')} className={styles.exportItem}>SQL</button>
                      </div>
                    </div>
                    <button onClick={toggleResultPanel} className={styles.collapseButton}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
                <div className={styles.resultContent}>
                  <ResultGrid
                    result={activeTab?.result || null}
                    loading={activeTab?.isLoading}
                    tableName={selectedTable}
                    onSave={handleSaveGridChanges}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

const ToolbarButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) => (
  <button className={styles.toolbarButton} onClick={onClick}>
    <span className={styles.toolbarIcon}>{icon}</span>
    {label}
  </button>
);

const SqlGenButton = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
  <button className={styles.sqlGenButton} onClick={onClick} draggable={false} disabled={disabled}>
    {label}
  </button>
);
