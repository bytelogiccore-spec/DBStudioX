import React, { useEffect, useState, useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useDatabaseStore } from '@/stores/databaseStore';
import { dbService } from '@/services/dbService';
import { SchemaInfo } from '@/schemas/query';
import TableNode from './ErDiagram/TableNode';
import styles from './ErDiagram/ErDiagram.module.css';

const nodeTypes = {
    table: TableNode,
};

const ErDiagramDashboard: React.FC = () => {
    const { activeConnection } = useDatabaseStore();
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSchema = useCallback(async () => {
        if (!activeConnection) return;
        setIsLoading(true);
        try {
            const schema: SchemaInfo = await dbService.getSchema(activeConnection.id);
            console.log('Loaded schema:', schema);

            // Transform schema to nodes and edges
            const newNodes: any[] = [];
            const newEdges: any[] = [];

            schema.tables.forEach((table, index) => {
                console.log(`Processing table ${table.name}:`, table);
                console.log(`Table columns:`, table.columns);

                const x = (index % 3) * 350;
                const y = Math.floor(index / 3) * 400;

                newNodes.push({
                    id: table.name,
                    type: 'table',
                    position: { x, y },
                    data: {
                        label: table.name,
                        columns: table.columns
                    }
                });

                // Foreign Keys -> Edges
                table.columns.forEach(col => {
                    if (col.foreignKey) {
                        newEdges.push({
                            id: `fk-${table.name}-${col.name}-${col.foreignKey.table}`,
                            source: table.name,
                            target: col.foreignKey.table,
                            sourceHandle: `${col.name}-source`,
                            targetHandle: `${col.foreignKey.column}-target`,
                            label: `${col.name} → ${col.foreignKey.column}`,
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: 'var(--brand-success)', strokeWidth: 2 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: 'var(--brand-success)',
                            },
                        });
                    }
                });
            });

            console.log('Generated nodes:', newNodes);
            console.log('Generated edges:', newEdges);

            setNodes(newNodes);
            setEdges(newEdges);
        } catch (error) {
            console.error('Failed to load schema for ER diagram:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeConnection, setNodes, setEdges]);

    useEffect(() => {
        loadSchema();
    }, [loadSchema]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Entity Relationship Diagram</h2>
                <button className={styles.refreshButton} onClick={loadSchema}>
                    Refresh Diagram
                </button>
            </div>
            <div className={styles.flowWrapper}>
                {isLoading ? (
                    <div className={styles.loading}>Generating Diagram...</div>
                ) : (
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        colorMode="dark"
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background color="#1a1a1a" gap={20} />
                        <Controls />
                        <MiniMap
                            nodeStrokeColor={(n: any) => 'var(--brand-primary)'}
                            nodeColor={(n: any) => 'var(--bg-secondary)'}
                            maskColor="rgba(0, 0, 0, 0.5)"
                        />
                    </ReactFlow>
                )}
            </div>
        </div>
    );
};

export default ErDiagramDashboard;
