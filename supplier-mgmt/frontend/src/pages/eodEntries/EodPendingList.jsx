import { useCallback, useEffect, useState } from 'react';
import { fetchPendingEod } from '../../api/eodEntries.js';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import Table from '../../components/Table.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { formatDate } from '../../utils/formatters.js';
import EodForm from './EodForm.jsx';

export default function EodPendingList({ onEntryCreated }) {
  const toast = useToast();
  const canAdd = usePermission('eod_entries', 'add');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await fetchPendingEod();
      setRows(data.data);
    } catch {
      setLoadError('Failed to load pending assignments.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
        <Table
          loading={loading}
          error={loadError}
          onRetry={load}
          emptyMessage="No pending assignments for today — all caught up."
          columns={[
            { key: 'assignmentDate', label: 'Date' },
            { key: 'driverLabel', label: 'Driver' },
            { key: 'vehicleLabel', label: 'Vehicle' },
            { key: 'company', label: 'Company' },
            { key: 'jobType', label: 'Job Type' },
            { key: 'routeLabel', label: 'From → To' },
            { key: 'plannedTrips', label: 'Planned Trips' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={rows.map((r) => ({
            ...r,
            assignmentDate: formatDate(r.assignmentDate),
            company: r.company?.companyName || '—',
            jobType: r.jobType?.name || '—',
            actions: canAdd ? (
              <Button
                className="px-3 py-1.5 text-xs"
                onClick={() => {
                  setSelectedAssignment(r);
                  setFormOpen(true);
                }}
              >
                Add EOD
              </Button>
            ) : (
              '—'
            ),
          }))}
        />

      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedAssignment(null);
        }}
        title="Add EOD Entry"
        size="lg"
      >
        {selectedAssignment && (
          <EodForm
            assignment={selectedAssignment}
            onCancel={() => {
              setFormOpen(false);
              setSelectedAssignment(null);
            }}
            onSuccess={() => {
              setFormOpen(false);
              setSelectedAssignment(null);
              load();
              onEntryCreated?.();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
