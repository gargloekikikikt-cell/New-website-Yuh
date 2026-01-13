import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/App";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2,
  Megaphone,
  Flag,
  Users,
  Package,
  Tags,
  Settings,
  Trash2,
  Check,
  Eye,
  X,
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, API } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [settings, setSettings] = useState({ max_portfolio_items: 7 });
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [maxPortfolio, setMaxPortfolio] = useState(7);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: "", id: "", name: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate("/dashboard");
      toast.error("Admin access required");
    }
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    try {
      const [reportsRes, announcementsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/admin/reports`, { withCredentials: true }),
        axios.get(`${API}/announcements`, { withCredentials: true }),
        axios.get(`${API}/settings`, { withCredentials: true }),
      ]);
      setReports(reportsRes.data);
      setAnnouncements(announcementsRes.data);
      setSettings(settingsRes.data);
      setMaxPortfolio(settingsRes.data.max_portfolio_items || 7);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [API]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchData();
    }
  }, [user, fetchData]);

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    try {
      await axios.post(
        `${API}/admin/announcements`,
        { message: newAnnouncement.trim() },
        { withCredentials: true }
      );
      toast.success("Announcement created");
      setNewAnnouncement("");
      fetchData();
    } catch (error) {
      toast.error("Failed to create announcement");
    }
  };

  const handleToggleAnnouncement = async (id, currentStatus) => {
    try {
      await axios.put(
        `${API}/admin/announcements/${id}?is_active=${!currentStatus}`,
        {},
        { withCredentials: true }
      );
      toast.success(`Announcement ${!currentStatus ? "activated" : "deactivated"}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update announcement");
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await axios.delete(`${API}/admin/announcements/${id}`, { withCredentials: true });
      toast.success("Announcement deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete announcement");
    }
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      await axios.put(
        `${API}/admin/reports/${reportId}?status=${status}`,
        {},
        { withCredentials: true }
      );
      toast.success("Report status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await axios.put(
        `${API}/admin/settings?max_portfolio_items=${maxPortfolio}`,
        {},
        { withCredentials: true }
      );
      toast.success("Settings updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { type, id } = deleteDialog;
      let endpoint = "";
      if (type === "user") endpoint = `${API}/admin/users/${id}`;
      else if (type === "item") endpoint = `${API}/admin/items/${id}`;
      else if (type === "category") endpoint = `${API}/admin/categories/${id}`;

      await axios.delete(endpoint, { withCredentials: true });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
      setDeleteDialog({ open: false, type: "", id: "", name: "" });
      fetchData();
    } catch (error) {
      toast.error(`Failed to delete ${deleteDialog.type}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (type, id, name) => {
    setDeleteDialog({ open: true, type, id, name });
  };

  if (!user?.is_admin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 spinner" />
        </div>
      </div>
    );
  }

  const pendingReports = reports.filter((r) => r.report.status === "pending");

  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1
            className="text-3xl font-bold text-slate-900"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Admin Dashboard
          </h1>
          <Badge className="bg-indigo-600">
            {pendingReports.length} pending reports
          </Badge>
        </div>

        <Tabs defaultValue="announcements" className="w-full">
          <TabsList className="mb-6 grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="announcements" data-testid="announcements-tab">
              <Megaphone className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="reports-tab">
              <Flag className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="settings-tab">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-6">
            {/* Create Announcement */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2
                className="font-semibold text-slate-900 mb-4"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Create Announcement
              </h2>
              <div className="flex gap-3">
                <Textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Enter announcement message..."
                  className="flex-1 bg-slate-50"
                  data-testid="announcement-input"
                />
                <Button
                  onClick={handleCreateAnnouncement}
                  disabled={!newAnnouncement.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  data-testid="create-announcement-btn"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  Post
                </Button>
              </div>
            </div>

            {/* Existing Announcements */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2
                className="font-semibold text-slate-900 mb-4"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Active Announcements
              </h2>
              {announcements.length === 0 ? (
                <p className="text-slate-500">No announcements</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div
                      key={ann.announcement_id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                      data-testid={`announcement-${ann.announcement_id}`}
                    >
                      <div className="flex-1">
                        <p className="text-slate-900">{ann.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(ann.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAnnouncement(ann.announcement_id, ann.is_active)}
                          data-testid={`toggle-announcement-${ann.announcement_id}`}
                        >
                          {ann.is_active ? <Eye className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAnnouncement(ann.announcement_id)}
                          data-testid={`delete-announcement-${ann.announcement_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            {reports.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
                <Flag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No reports yet</p>
              </div>
            ) : (
              reports.map(({ report, reporter }) => (
                <div
                  key={report.report_id}
                  className="bg-white rounded-2xl border border-slate-100 p-6"
                  data-testid={`report-${report.report_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={report.status === "pending" ? "destructive" : "secondary"}
                        >
                          {report.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {report.report_type}
                        </Badge>
                      </div>
                      <p className="text-slate-900 font-medium mb-1">
                        Target: {report.target_id}
                      </p>
                      <p className="text-slate-600 mb-2">{report.reason}</p>
                      <p className="text-xs text-slate-500">
                        Reported by: {reporter?.username || reporter?.name || "Unknown"} •{" "}
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {report.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateReportStatus(report.report_id, "reviewed")}
                            data-testid={`review-report-${report.report_id}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateReportStatus(report.report_id, "resolved")}
                            data-testid={`resolve-report-${report.report_id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>
                        </>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openDeleteDialog(report.report_type, report.target_id, report.target_id)}
                        data-testid={`delete-target-${report.report_id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete {report.report_type}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2
                className="font-semibold text-slate-900 mb-6"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Global Settings
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">Max Portfolio Items</p>
                    <p className="text-sm text-slate-500">
                      Maximum number of items users can add to their portfolio
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={maxPortfolio}
                      onChange={(e) => setMaxPortfolio(parseInt(e.target.value) || 7)}
                      min={1}
                      max={50}
                      className="w-20 bg-slate-50"
                      data-testid="max-portfolio-input"
                    />
                    <Button
                      onClick={handleUpdateSettings}
                      className="bg-indigo-600 hover:bg-indigo-700"
                      data-testid="save-settings-btn"
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-slate-900 mb-2">Boosting Algorithm</h3>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                    <p className="mb-2">
                      <strong>How pins boost items:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Each pin adds 10 base points</li>
                      <li>Points decay over time: <code>score = 10 / (1 + days_old × 0.1)</code></li>
                      <li>Pin today = 10 pts, 10 days old = 5 pts, 30 days old = 2.5 pts</li>
                      <li>Total boost = sum of all decayed pin scores</li>
                      <li>Items with higher boost appear first in their category</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ ...deleteDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteDialog.type}? This action cannot be undone.
              {deleteDialog.type === "user" && " All their items, messages, and trades will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
