import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/App";
import { X, Megaphone } from "lucide-react";

export const AnnouncementBanner = () => {
  const { API } = useAuth();
  const [announcement, setAnnouncement] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await axios.get(`${API}/announcements`);
        if (response.data.length > 0) {
          // Get the most recent active announcement
          setAnnouncement(response.data[0]);
        }
      } catch (error) {
        // Silently fail - announcements are not critical
      }
    };

    fetchAnnouncements();
  }, [API]);

  if (!announcement || isDismissed) {
    return null;
  }

  return (
    <div
      className="bg-indigo-600 text-white py-3 px-4"
      data-testid="announcement-banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Megaphone className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{announcement.message}</p>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
          data-testid="dismiss-announcement-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
