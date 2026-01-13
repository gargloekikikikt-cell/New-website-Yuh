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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Search,
  Ban,
  BarChart3,
  ChevronRight,
  Plus,
  MessageSquarePlus,
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, API } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState({ main: [], sub: [], bottom: [] });
  const [categoryRequests, setCategoryRequests] = useState([]);
  const [settings, setSettings] = useState({ max_portfolio_items: 7 });
  
  // Form states
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [maxPortfolio, setMaxPortfolio] = useState(7);
  const [userSearch, setUserSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showSuspendedOnly, setShowSuspendedOnly] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParent, setNewCategoryParent] = useState("");
  
  // Selection states for bulk actions
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // Modal states
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: "", id: "", name: "" });
  const [suspendDialog, setSuspendDialog] = useState({ open: false, user: null });
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendReason, setSuspendReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (user && !user.is_admin) {
      navigate("/dashboard");
      toast.error("Admin access required");
    }
  }, [user, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, { withCredentials: true });
      setStats(response.data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, [API]);

  const fetchReports = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/reports`, { withCredentials: true });
      setReports(response.data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    }
  }, [API]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/announcements`, { withCredentials: true });
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    }
  }, [API]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = {};
      if (userSearch) params.search = userSearch;
      if (showSuspendedOnly) params.suspended_only = true;
      const response = await axios.get(`${API}/admin/users`, { params, withCredentials: true });
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, [API, userSearch, showSuspendedOnly]);

  const fetchItems = useCallback(async () => {
    try {
      const params = {};
      if (itemSearch) params.search = itemSearch;
      const response = await axios.get(`${API}/admin/items`, { params, withCredentials: true });
      setItems(response.data);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  }, [API, itemSearch]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/categories`, { withCredentials: true });
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, [API]);

  const fetchCategoryRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/category-requests`, { withCredentials: true });
      setCategoryRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch category requests:", error);
    }
  }, [API]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/settings`, { withCredentials: true });
      setSettings(response.data);
      setMaxPortfolio(response.data.max_portfolio_items || 7);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, [API]);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchReports(),
      fetchAnnouncements(),
      fetchUsers(),
      fetchItems(),
      fetchCategories(),
      fetchCategoryRequests(),
      fetchSettings(),
    ]);
    setIsLoading(false);
  }, [fetchStats, fetchReports, fetchAnnouncements, fetchUsers, fetchItems, fetchCategories, fetchCategoryRequests, fetchSettings]);

  useEffect(() => {
    if (user?.is_admin) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.is_admin) fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, showSuspendedOnly, fetchUsers, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.is_admin) fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, fetchItems, user]);

  // Handlers
  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    setIsProcessing(true);
    try {
      await axios.post(`${API}/admin/announcements`, { message: newAnnouncement.trim() }, { withCredentials: true });
      toast.success("Announcement created");
      setNewAnnouncement("");
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to create announcement");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAnnouncement = async (id, currentStatus) => {
    try {
      await axios.put(`${API}/admin/announcements/${id}?is_active=${!currentStatus}`, {}, { withCredentials: true });
      toast.success(`Announcement ${!currentStatus ? "activated" : "deactivated"}`);
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to update announcement");
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await axios.delete(`${API}/admin/announcements/${id}`, { withCredentials: true });
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to delete announcement");
    }
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      await axios.put(`${API}/admin/reports/${reportId}?status=${status}`, {}, { withCredentials: true });
      toast.success("Report status updated");
      fetchReports();
      fetchStats();
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  const handleUpdateSettings = async () => {
    setIsProcessing(true);
    try {
      await axios.put(`${API}/admin/settings?max_portfolio_items=${maxPortfolio}`, {}, { withCredentials: true });
      toast.success("Settings updated");
      fetchSettings();
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      const { type, id } = deleteDialog;
      let endpoint = "";
      if (type === "user") endpoint = `${API}/admin/users/${id}`;
      else if (type === "item") endpoint = `${API}/admin/items/${id}`;
      else if (type === "category") endpoint = `${API}/admin/categories/${encodeURIComponent(id)}`;

      await axios.delete(endpoint, { withCredentials: true });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
      setDeleteDialog({ open: false, type: "", id: "", name: "" });
      
      // Refresh relevant data
      if (type === "user") fetchUsers();
      else if (type === "item") fetchItems();
      else if (type === "category") fetchCategories();
      fetchStats();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.detail || `Failed to delete ${deleteDialog.type}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendDialog.user) return;
    setIsProcessing(true);
    try {
      await axios.post(
        `${API}/admin/users/${suspendDialog.user.user_id}/suspend`,
        { days: suspendDays, reason: suspendReason },
        { withCredentials: true }
      );
      toast.success(suspendDays > 0 ? `User suspended for ${suspendDays} days` : "User unsuspended");
      setSuspendDialog({ open: false, user: null });
      setSuspendDays(7);
      setSuspendReason("");
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to suspend user");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDeleteItems = async () => {
    if (selectedItems.length === 0) return;
    setIsProcessing(true);
    try {
      await axios.post(`${API}/admin/items/bulk-delete`, { item_ids: selectedItems }, { withCredentials: true });
      toast.success(`Deleted ${selectedItems.length} items`);
      setSelectedItems([]);
      fetchItems();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete items");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedCategories.length === 0) return;
    setIsProcessing(true);
    try {
      await axios.post(`${API}/admin/categories/bulk-delete`, { category_names: selectedCategories }, { withCredentials: true });
      toast.success(`Deleted ${selectedCategories.length} categories`);
      setSelectedCategories([]);
      fetchCategories();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete categories");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    if (newCategoryName.includes(" ")) {
      toast.error("Category name must be a single word");
      return;
    }
    setIsProcessing(true);
    try {
      await axios.post(
        `${API}/admin/categories`,
        {
          name: newCategoryName.trim().toLowerCase(),
          parent_category: newCategoryParent || null,
        },
        { withCredentials: true }
      );
      toast.success("Category created");
      setNewCategoryName("");
      setNewCategoryParent("");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create category");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveCategoryRequest = async (requestId) => {
    setIsProcessing(true);
    try {
      await axios.post(`${API}/admin/category-requests/${requestId}/approve`, {}, { withCredentials: true });
      toast.success("Category request approved and category created");
      fetchCategoryRequests();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve request");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectCategoryRequest = async (requestId) => {
    setIsProcessing(true);
    try {
      await axios.post(`${API}/admin/category-requests/${requestId}/reject`, {}, { withCredentials: true });
      toast.success("Category request rejected");
      fetchCategoryRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to reject request");
    } finally {
      setIsProcessing(false);
    }
  };

  const openDeleteDialog = (type, id, name) => {
    setDeleteDialog({ open: true, type, id, name });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user?.is_admin) return null;

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
  const pendingRequests = categoryRequests.filter((r) => r.request.status === "pending");

  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Header with Stats */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-slate-900" style={{ fontFamily: "Manrope, sans-serif" }}>
            Admin Dashboard
          </h1>
          <div className="flex gap-2">
            {pendingRequests.length > 0 && (
              <Badge className="bg-amber-500">{pendingRequests.length} category requests</Badge>
            )}
            <Badge variant={pendingReports.length > 0 ? "destructive" : "secondary"}>
              {pendingReports.length} pending reports
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.users.total}</p>
                  <p className="text-xs text-slate-500">Users ({stats.users.suspended} suspended)</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.items.total}</p>
                  <p className="text-xs text-slate-500">Items ({stats.items.available} available)</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.trades.completed}</p>
                  <p className="text-xs text-slate-500">Completed Trades</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Tags className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.categories.total}</p>
                  <p className="text-xs text-slate-500">Categories</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="mb-6 flex flex-wrap gap-1">
            <TabsTrigger value="categories" data-testid="categories-tab">
              <Tags className="w-4 h-4 mr-2" />
              Categories
              {pendingRequests.length > 0 && (
                <Badge className="ml-2 bg-amber-500">{pendingRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="reports-tab">
              <Flag className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="items" data-testid="items-tab">
              <Package className="w-4 h-4 mr-2" />
              Items
            </TabsTrigger>
            <TabsTrigger value="announcements" data-testid="announcements-tab">
              <Megaphone className="w-4 h-4 mr-2" />
              Announcements
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="settings-tab">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            {/* Create Category */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Create New Category</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value.replace(/\s/g, ''))}
                  placeholder="Category name (single word)"
                  className="bg-slate-50 flex-1"
                  data-testid="new-category-input"
                />
                <Select value={newCategoryParent} onValueChange={setNewCategoryParent}>
                  <SelectTrigger className="bg-slate-50 w-full sm:w-48">
                    <SelectValue placeholder="Parent (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (main category)</SelectItem>
                    {categories.main.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name} className="capitalize">{cat.name}</SelectItem>
                    ))}
                    {categories.sub.map((cat) => (
                      <SelectItem key={`sub-${cat.name}`} value={cat.name} className="capitalize pl-6">↳ {cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleCreateCategory} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" /> Create
                </Button>
              </div>
            </div>

            {/* Category Requests */}
            {pendingRequests.length > 0 && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
                <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5" />
                  Category Requests ({pendingRequests.length})
                </h3>
                <div className="space-y-3">
                  {pendingRequests.map(({ request, user: reqUser }) => (
                    <div key={request.request_id} className="bg-white rounded-xl p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium capitalize">{request.category_name}</span>
                          {request.parent_category && (
                            <span className="text-sm text-slate-500">under {request.parent_category}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{request.reason}</p>
                        <p className="text-xs text-slate-400">
                          Requested by {reqUser?.username || reqUser?.name || "Unknown"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApproveCategoryRequest(request.request_id)} disabled={isProcessing} className="bg-teal-600 hover:bg-teal-700">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRejectCategoryRequest(request.request_id)} disabled={isProcessing}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            {selectedCategories.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 flex justify-between items-center">
                <span className="text-slate-600">{selectedCategories.length} categories selected</span>
                <Button variant="destructive" onClick={handleBulkDeleteCategories} disabled={isProcessing} data-testid="bulk-delete-categories-btn">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                </Button>
              </div>
            )}

            {/* Main Categories */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Main Categories ({categories.main.length})</h3>
              {categories.main.length === 0 ? (
                <p className="text-slate-500">No main categories yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.main.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1 py-1">
                      <Checkbox
                        checked={selectedCategories.includes(cat.name)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedCategories([...selectedCategories, cat.name]);
                          else setSelectedCategories(selectedCategories.filter((n) => n !== cat.name));
                        }}
                        className="mr-1"
                      />
                      <span className="text-sm capitalize">{cat.name}</span>
                      <span className="text-xs text-slate-500">({cat.click_count})</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600" onClick={() => openDeleteDialog("category", cat.name, cat.name)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sub Categories */}
            {categories.sub.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Subcategories ({categories.sub.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.sub.map((cat) => (
                    <div key={`${cat.parent_category}-${cat.name}`} className="flex items-center gap-1 bg-blue-50 rounded-full pl-3 pr-1 py-1">
                      <Checkbox
                        checked={selectedCategories.includes(cat.name)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedCategories([...selectedCategories, cat.name]);
                          else setSelectedCategories(selectedCategories.filter((n) => n !== cat.name));
                        }}
                        className="mr-1"
                      />
                      <span className="text-xs text-slate-500 capitalize">{cat.parent_category}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="text-sm capitalize">{cat.name}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600" onClick={() => openDeleteDialog("category", cat.name, cat.name)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Categories */}
            {categories.bottom.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Bottom Categories ({categories.bottom.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.bottom.map((cat) => (
                    <div key={`${cat.parent_category}-${cat.name}`} className="flex items-center gap-1 bg-green-50 rounded-full pl-3 pr-1 py-1">
                      <Checkbox
                        checked={selectedCategories.includes(cat.name)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedCategories([...selectedCategories, cat.name]);
                          else setSelectedCategories(selectedCategories.filter((n) => n !== cat.name));
                        }}
                        className="mr-1"
                      />
                      <span className="text-xs text-slate-500 capitalize">{cat.parent_category}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="text-sm capitalize">{cat.name}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600" onClick={() => openDeleteDialog("category", cat.name, cat.name)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <div key={report.report_id} className="bg-white rounded-2xl border border-slate-100 p-6" data-testid={`report-${report.report_id}`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant={report.status === "pending" ? "destructive" : report.status === "reviewed" ? "secondary" : "outline"}>
                          {report.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">{report.report_type}</Badge>
                      </div>
                      <p className="text-slate-900 font-medium mb-1 break-all">Target: {report.target_id}</p>
                      <p className="text-slate-600 mb-2">{report.reason}</p>
                      <p className="text-xs text-slate-500">
                        Reported by: {reporter?.username || reporter?.name || "Unknown"} • {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {report.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleUpdateReportStatus(report.report_id, "reviewed")}>
                            <Eye className="w-4 h-4 mr-1" /> Review
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleUpdateReportStatus(report.report_id, "resolved")}>
                            <Check className="w-4 h-4 mr-1" /> Resolve
                          </Button>
                        </div>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(report.report_type, report.target_id, report.target_id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete {report.report_type}
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search users by name, email, or username..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 bg-slate-50"
                    data-testid="user-search-input"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showSuspendedOnly} onCheckedChange={setShowSuspendedOnly} />
                  <span className="text-sm text-slate-600">Suspended only</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No users found</div>
                ) : (
                  users.map((u) => (
                    <div key={u.user_id} className="p-4 flex items-center justify-between gap-4 flex-wrap" data-testid={`user-row-${u.user_id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={u.picture} alt={u.name} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-600">{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900 truncate">{u.username || u.name}</p>
                            {u.is_admin && <Badge className="bg-indigo-600">Admin</Badge>}
                            {u.is_suspended && <Badge variant="destructive">Suspended</Badge>}
                          </div>
                          <p className="text-sm text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm text-slate-500">{u.trade_points || 0} pts</span>
                        {!u.is_admin && (
                          <>
                            <Button
                              variant={u.is_suspended ? "outline" : "secondary"}
                              size="sm"
                              onClick={() => {
                                setSuspendDays(u.is_suspended ? 0 : 7);
                                setSuspendReason("");
                                setSuspendDialog({ open: true, user: u });
                              }}
                              data-testid={`suspend-btn-${u.user_id}`}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              {u.is_suspended ? "Unsuspend" : "Suspend"}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => openDeleteDialog("user", u.user_id, u.name)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search items by title..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="pl-10 bg-slate-50"
                    data-testid="item-search-input"
                  />
                </div>
                {selectedItems.length > 0 && (
                  <Button variant="destructive" onClick={handleBulkDeleteItems} disabled={isProcessing} data-testid="bulk-delete-items-btn">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete {selectedItems.length} selected
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No items found</div>
                ) : (
                  items.map(({ item, owner }) => (
                    <div key={item.item_id} className="p-4 flex items-center gap-4" data-testid={`item-row-${item.item_id}`}>
                      <Checkbox
                        checked={selectedItems.includes(item.item_id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedItems([...selectedItems, item.item_id]);
                          else setSelectedItems(selectedItems.filter((id) => id !== item.item_id));
                        }}
                      />
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{item.title}</p>
                        <p className="text-sm text-slate-500">
                          {item.category} • by {owner?.username || owner?.name || "Unknown"}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {!item.is_available && <Badge variant="secondary">Traded</Badge>}
                          {item.boost_score > 0 && <Badge className="bg-amber-500">{item.boost_score.toFixed(1)} boost</Badge>}
                        </div>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteDialog("item", item.item_id, item.title)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Create Announcement</h2>
              <div className="flex gap-3">
                <Textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Enter announcement message..."
                  className="flex-1 bg-slate-50"
                  data-testid="announcement-input"
                />
                <Button onClick={handleCreateAnnouncement} disabled={!newAnnouncement.trim() || isProcessing} className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-announcement-btn">
                  <Megaphone className="w-4 h-4 mr-2" /> Post
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Announcements</h2>
              {announcements.length === 0 ? (
                <p className="text-slate-500">No announcements</p>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div key={ann.announcement_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl gap-4" data-testid={`announcement-${ann.announcement_id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900">{ann.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(ann.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => handleToggleAnnouncement(ann.announcement_id, ann.is_active)}>
                          {ann.is_active ? <Eye className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteAnnouncement(ann.announcement_id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-semibold text-slate-900 mb-6">Global Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="font-medium text-slate-900">Max Portfolio Items</p>
                    <p className="text-sm text-slate-500">Maximum number of items users can add to their portfolio</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input type="number" value={maxPortfolio} onChange={(e) => setMaxPortfolio(parseInt(e.target.value) || 7)} min={1} max={50} className="w-20 bg-slate-50" data-testid="max-portfolio-input" />
                    <Button onClick={handleUpdateSettings} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-settings-btn">
                      Save
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-slate-900 mb-2">Boosting Algorithm</h3>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                    <p className="mb-2"><strong>How pins boost items:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Each pin adds 10 base points</li>
                      <li>Points decay over time: <code className="bg-slate-200 px-1 rounded">score = 10 / (1 + days_old × 0.1)</code></li>
                      <li>Pin today = 10 pts, 10 days old = 5 pts, 30 days old = 2.5 pts</li>
                      <li>Higher boost = higher position in category</li>
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
              Are you sure you want to delete "{deleteDialog.name}"? This action cannot be undone.
              {deleteDialog.type === "user" && " All their items, messages, and trades will also be deleted."}
              {deleteDialog.type === "category" && " All subcategories will also be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-red-600 hover:bg-red-700">
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(open) => !open && setSuspendDialog({ open: false, user: null })}>
        <DialogContent className="sm:max-w-md" data-testid="suspend-modal">
          <DialogHeader>
            <DialogTitle>
              {suspendDialog.user?.is_suspended ? "Unsuspend" : "Suspend"} User
            </DialogTitle>
            <DialogDescription>
              {suspendDialog.user?.is_suspended
                ? `Unsuspend ${suspendDialog.user?.username || suspendDialog.user?.name}?`
                : `How long do you want to suspend ${suspendDialog.user?.username || suspendDialog.user?.name}?`}
            </DialogDescription>
          </DialogHeader>

          {!suspendDialog.user?.is_suspended && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Suspension Duration</Label>
                <Select value={suspendDays.toString()} onValueChange={(v) => setSuspendDays(parseInt(v))}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension..."
                  className="bg-slate-50"
                  data-testid="suspend-reason-input"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog({ open: false, user: null })} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleSuspend}
              disabled={isProcessing}
              className={suspendDialog.user?.is_suspended ? "bg-teal-600 hover:bg-teal-700" : "bg-red-600 hover:bg-red-700"}
              data-testid="confirm-suspend-btn"
            >
              {isProcessing ? "Processing..." : suspendDialog.user?.is_suspended ? "Unsuspend" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
