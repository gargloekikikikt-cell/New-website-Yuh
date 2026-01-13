import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/App";
import { Header } from "@/components/Header";
import { DisplayRating } from "@/components/StarRating";
import { ReportModal } from "@/components/ReportModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeftRight, MessageCircle, Loader2, ArrowLeft, Trash2, Pin, Flag, TrendingUp } from "lucide-react";

const ItemDetail = () => {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { user, API } = useAuth();
  const [item, setItem] = useState(null);
  const [owner, setOwner] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTradeOpen, setIsTradeOpen] = useState(false);
  const [isCreatingTrade, setIsCreatingTrade] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const isOwner = user?.user_id === item?.user_id;

  const fetchItem = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/items/${itemId}`, { withCredentials: true });
      setItem(response.data.item);
      setOwner(response.data.owner);

      // Check pin status
      try {
        const pinRes = await axios.get(`${API}/items/${itemId}/pin-status`, { withCredentials: true });
        setIsPinned(pinRes.data.is_pinned);
      } catch {
        // Ignore pin status errors
      }
    } catch (error) {
      console.error("Failed to fetch item:", error);
      toast.error("Item not found");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [API, itemId, navigate]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      await axios.post(
        `${API}/messages`,
        {
          receiver_id: owner.user_id,
          item_id: itemId,
          content: message.trim(),
        },
        { withCredentials: true }
      );
      toast.success("Message sent!");
      setMessage("");
      setIsMessageOpen(false);
      navigate(`/messages/${owner.user_id}`);
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleStartTrade = async () => {
    setIsCreatingTrade(true);
    try {
      await axios.post(
        `${API}/trades`,
        {
          item_id: itemId,
          owner_id: owner.user_id,
        },
        { withCredentials: true }
      );
      toast.success("Trade initiated! Check your trades page.");
      setIsTradeOpen(false);
      navigate("/trades");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start trade");
    } finally {
      setIsCreatingTrade(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    setIsDeleting(true);
    try {
      await axios.delete(`${API}/items/${itemId}`, { withCredentials: true });
      toast.success("Item deleted");
      navigate("/my-items");
    } catch (error) {
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePin = async () => {
    setIsPinning(true);
    try {
      if (isPinned) {
        await axios.delete(`${API}/items/${itemId}/pin`, { withCredentials: true });
        toast.success("Item unpinned");
        setIsPinned(false);
      } else {
        const response = await axios.post(`${API}/items/${itemId}/pin`, {}, { withCredentials: true });
        toast.success(`Item pinned! New boost: ${response.data.new_boost_score}`);
        setIsPinned(true);
      }
      fetchItem(); // Refresh to get updated boost score
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update pin");
    } finally {
      setIsPinning(false);
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

  if (!item) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="text-center py-20">
          <p className="text-slate-500 text-lg">Item not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="item-detail-page">
      <Header />

      <main className="max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-slate-600 hover:text-slate-900"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="rounded-2xl overflow-hidden bg-slate-100 relative">
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover"
              style={{ minHeight: "400px" }}
              data-testid="item-image"
            />
            {/* Boost Badge */}
            {item.boost_score > 0 && (
              <Badge className="absolute top-4 right-4 bg-amber-500">
                <TrendingUp className="w-3 h-3 mr-1" />
                {item.boost_score.toFixed(1)} boost • {item.pin_count} pins
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="capitalize bg-slate-100 text-slate-600 border-0">
                  {item.category}
                </Badge>
                {item.subcategory && (
                  <Badge variant="outline" className="capitalize">
                    {item.subcategory}
                  </Badge>
                )}
                {item.bottom_category && (
                  <Badge variant="outline" className="capitalize">
                    {item.bottom_category}
                  </Badge>
                )}
              </div>
              <h1
                className="text-3xl font-bold text-slate-900 mb-3"
                style={{ fontFamily: "Manrope, sans-serif" }}
                data-testid="item-title"
              >
                {item.title}
              </h1>
              {item.description && (
                <p className="text-slate-600 leading-relaxed" data-testid="item-description">
                  {item.description}
                </p>
              )}
            </div>

            {/* Owner Card */}
            {owner && (
              <div
                className="bg-slate-50 rounded-2xl p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => navigate(`/profile/${owner.user_id}`)}
                data-testid="owner-card"
              >
                <p className="text-sm text-slate-500 mb-2">Posted by</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={owner.picture} alt={owner.name} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600">
                      {getInitials(owner.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {owner.username || owner.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-teal-600 font-medium">
                        {owner.trade_points || 0} trades
                      </span>
                      <DisplayRating rating={owner.rating} count={owner.rating_count} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {!isOwner && item.is_available && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsTradeOpen(true)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-6 shadow-lg hover:shadow-indigo-500/30 transition-all"
                    data-testid="trade-btn"
                  >
                    <ArrowLeftRight className="w-5 h-5 mr-2" />
                    Start Trade
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsMessageOpen(true)}
                    className="rounded-full py-6"
                    data-testid="message-btn"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Message
                  </Button>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant={isPinned ? "secondary" : "outline"}
                    onClick={handlePin}
                    disabled={isPinning}
                    className="flex-1 rounded-full"
                    data-testid="pin-btn"
                  >
                    <Pin className={`w-4 h-4 mr-2 ${isPinned ? "fill-current" : ""}`} />
                    {isPinning ? "..." : isPinned ? "Pinned" : "Pin to Boost"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsReportOpen(true)}
                    className="text-slate-500 hover:text-red-600"
                    data-testid="report-item-btn"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </Button>
                </div>
              </div>
            )}

            {isOwner && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-full"
                data-testid="delete-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Item"}
              </Button>
            )}

            {!item.is_available && (
              <div className="bg-slate-100 rounded-2xl p-4 text-center">
                <p className="text-slate-500">This item is no longer available</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Message Dialog */}
      <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
        <DialogContent className="sm:max-w-md" data-testid="message-modal">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>
              Send Message
            </DialogTitle>
            <DialogDescription>
              Message {owner?.username || owner?.name} about this item
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'm interested in trading for this item..."
            className="min-h-[120px] bg-slate-50"
            data-testid="message-textarea"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="send-message-btn"
            >
              {isSending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade Confirmation Dialog */}
      <Dialog open={isTradeOpen} onOpenChange={setIsTradeOpen}>
        <DialogContent className="sm:max-w-md" data-testid="trade-modal">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>
              Start Trade
            </DialogTitle>
            <DialogDescription>
              Would you like to initiate a trade for "{item.title}"?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-slate-600">
              Once you start a trade, you can message the owner to negotiate.
              Both parties must click "Trade Finished" to complete the trade and earn points.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTradeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStartTrade}
              disabled={isCreatingTrade}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="confirm-trade-btn"
            >
              {isCreatingTrade ? "Starting..." : "Start Trade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="item"
        targetId={itemId}
        targetName={item?.title}
      />
    </div>
  );
};

export default ItemDetail;
