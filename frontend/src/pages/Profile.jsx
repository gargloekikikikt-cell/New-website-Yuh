import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/App";
import { Header } from "@/components/Header";
import { ItemCard } from "@/components/ItemCard";
import { DisplayRating } from "@/components/StarRating";
import { ReportModal } from "@/components/ReportModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ArrowLeftRight, Edit2, Loader2, Flag, Trash2, Briefcase, Package, TrendingUp } from "lucide-react";

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser, logout, API } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [items, setItems] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settings, setSettings] = useState({ max_portfolio_items: 7 });

  const isOwnProfile = currentUser?.user_id === userId;

  const fetchProfile = useCallback(async () => {
    try {
      const [userRes, itemsRes, portfolioRes, settingsRes] = await Promise.all([
        axios.get(`${API}/users/${userId}`, { withCredentials: true }),
        axios.get(`${API}/items`, { params: { user_id: userId }, withCredentials: true }),
        axios.get(`${API}/users/${userId}/portfolio`, { withCredentials: true }),
        axios.get(`${API}/settings`, { withCredentials: true }),
      ]);
      setProfileUser(userRes.data);
      setItems(itemsRes.data);
      setPortfolio(portfolioRes.data);
      setSettings(settingsRes.data);
      setEditUsername(userRes.data.username || "");
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [API, userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      toast.error("Username cannot be empty");
      return;
    }
    if (editUsername.includes(" ")) {
      toast.error("Username must be a single word");
      return;
    }

    setIsSaving(true);
    try {
      const response = await axios.put(
        `${API}/users/profile`,
        { username: editUsername.trim() },
        { withCredentials: true }
      );
      setProfileUser(response.data);
      setUser(response.data);
      setIsEditOpen(false);
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`${API}/users/account`, { withCredentials: true });
      toast.success("Account deleted. Goodbye!");
      await logout();
      navigate("/");
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddToPortfolio = async (itemId) => {
    const currentPortfolio = profileUser.portfolio || [];
    if (currentPortfolio.length >= settings.max_portfolio_items) {
      toast.error(`Portfolio can have at most ${settings.max_portfolio_items} items`);
      return;
    }
    if (currentPortfolio.includes(itemId)) {
      toast.error("Item already in portfolio");
      return;
    }

    try {
      const newPortfolio = [...currentPortfolio, itemId];
      await axios.put(
        `${API}/users/portfolio`,
        { item_ids: newPortfolio },
        { withCredentials: true }
      );
      toast.success("Added to portfolio!");
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update portfolio");
    }
  };

  const handleRemoveFromPortfolio = async (itemId) => {
    const currentPortfolio = profileUser.portfolio || [];
    const newPortfolio = currentPortfolio.filter((id) => id !== itemId);

    try {
      await axios.put(
        `${API}/users/portfolio`,
        { item_ids: newPortfolio },
        { withCredentials: true }
      );
      toast.success("Removed from portfolio");
      fetchProfile();
    } catch (error) {
      toast.error("Failed to update portfolio");
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="text-center py-20">
          <p className="text-slate-500 text-lg">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="profile-page">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm mb-8" data-testid="profile-card">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              <AvatarImage src={profileUser.picture} alt={profileUser.name} />
              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-2xl">
                {getInitials(profileUser.name)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <h1
                  className="text-2xl font-bold text-slate-900"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                  data-testid="profile-name"
                >
                  {profileUser.username || profileUser.name}
                </h1>
                {isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    className="text-slate-500 hover:text-indigo-600"
                    data-testid="edit-profile-btn"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                {!isOwnProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReportOpen(true)}
                    className="text-slate-500 hover:text-red-600"
                    data-testid="report-user-btn"
                  >
                    <Flag className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {profileUser.username && (
                <p className="text-slate-500 mb-3">{profileUser.name}</p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-center md:justify-start gap-6 mt-4">
                {/* Trade Points */}
                <div className="flex items-center gap-2">
                  <div className="trade-badge flex items-center gap-1">
                    <ArrowLeftRight className="w-4 h-4" />
                    <span data-testid="trade-points">{profileUser.trade_points || 0}</span>
                  </div>
                  <span className="text-sm text-slate-500">Trade Points</span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <DisplayRating
                    rating={profileUser.rating}
                    count={profileUser.rating_count}
                  />
                </div>
              </div>

              {/* Admin Badge */}
              {profileUser.is_admin && (
                <Badge className="mt-4 bg-indigo-600">Admin</Badge>
              )}
            </div>

            {/* Actions */}
            {isOwnProfile && (
              <div className="flex flex-col gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteAccountOpen(true)}
                  className="rounded-full"
                  data-testid="delete-account-btn"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs for Portfolio and Items */}
        <Tabs defaultValue="portfolio" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="portfolio" data-testid="portfolio-tab">
              <Briefcase className="w-4 h-4 mr-2" />
              Portfolio ({portfolio.length}/{settings.max_portfolio_items})
            </TabsTrigger>
            <TabsTrigger value="items" data-testid="items-tab">
              <Package className="w-4 h-4 mr-2" />
              All Items ({items.length})
            </TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp className="w-4 h-4" />
              <span>Items sorted by boost score (most pinned first)</span>
            </div>

            {portfolio.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {isOwnProfile
                    ? "Your portfolio is empty. Add items to showcase your best trades!"
                    : "No items in portfolio"}
                </p>
              </div>
            ) : (
              <div className="masonry-grid" data-testid="portfolio-grid">
                {portfolio.map((item) => (
                  <div key={item.item_id} className="relative">
                    <ItemCard item={item} owner={profileUser} />
                    {item.boost_score > 0 && (
                      <Badge className="absolute top-3 right-3 bg-amber-500">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {item.boost_score.toFixed(1)}
                      </Badge>
                    )}
                    {isOwnProfile && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute bottom-3 right-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemoveFromPortfolio(item.item_id);
                        }}
                        data-testid={`remove-portfolio-${item.item_id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Items Tab */}
          <TabsContent value="items">
            {items.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl">
                <p className="text-slate-500">
                  {isOwnProfile
                    ? "You haven't posted any items yet"
                    : "No items available"}
                </p>
              </div>
            ) : (
              <div className="masonry-grid" data-testid="profile-items-grid">
                {items.map((item) => {
                  const inPortfolio = (profileUser.portfolio || []).includes(item.item_id);
                  return (
                    <div key={item.item_id} className="relative group">
                      <ItemCard item={item} owner={profileUser} />
                      {isOwnProfile && !inPortfolio && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-3 right-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToPortfolio(item.item_id);
                          }}
                          data-testid={`add-portfolio-${item.item_id}`}
                        >
                          <Briefcase className="w-3 h-3 mr-1" />
                          Add to Portfolio
                        </Button>
                      )}
                      {inPortfolio && (
                        <Badge className="absolute bottom-3 right-3 bg-indigo-600">
                          In Portfolio
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md" data-testid="edit-profile-modal">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>
              Edit Profile
            </DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Enter a username (single word)"
                className="bg-slate-50"
                data-testid="username-input"
              />
              <p className="text-xs text-slate-500">
                Username must be a single word with no spaces
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="save-profile-btn"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={isDeleteAccountOpen} onOpenChange={setIsDeleteAccountOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your items, messages, trades, and data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-account-btn"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="user"
        targetId={userId}
        targetName={profileUser?.username || profileUser?.name}
      />
    </div>
  );
};

export default Profile;
