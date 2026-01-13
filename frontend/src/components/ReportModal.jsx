import { useState } from "react";
import axios from "axios";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Flag } from "lucide-react";

export const ReportModal = ({ isOpen, onClose, targetType, targetId, targetName }) => {
  const { API } = useAuth();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your report");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(
        `${API}/reports`,
        {
          report_type: targetType,
          target_id: targetId,
          reason: reason.trim(),
        },
        { withCredentials: true }
      );
      toast.success("Report submitted. Thank you for helping keep our community safe.");
      setReason("");
      onClose();
    } catch (error) {
      toast.error("Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="report-modal">
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            <Flag className="w-5 h-5 text-red-500" />
            Report {targetType}
          </DialogTitle>
          <DialogDescription>
            Report "{targetName}" for violating community guidelines
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What's the issue?</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe why you're reporting this..."
              className="min-h-[120px] bg-slate-50"
              data-testid="report-reason-input"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            className="bg-red-600 hover:bg-red-700"
            data-testid="submit-report-btn"
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
