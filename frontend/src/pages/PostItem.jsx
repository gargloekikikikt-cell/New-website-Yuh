import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/App";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, Plus, HelpCircle } from "lucide-react";

const PostItem = () => {
  const navigate = useNavigate();
  const { API } = useAuth();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [bottomCategories, setBottomCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    bottom_category: "",
    image: "",
  });

  // Category request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({
    category_name: "",
    parent_category: "",
    reason: "",
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/categories?level=0`, { withCredentials: true });
      setCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, [API]);

  const fetchSubcategories = useCallback(async (parent) => {
    if (!parent) {
      setSubcategories([]);
      return;
    }
    try {
      const response = await axios.get(`${API}/categories?level=1&parent=${parent}`, { withCredentials: true });
      setSubcategories(response.data);
    } catch (error) {
      console.error("Failed to fetch subcategories:", error);
    }
  }, [API]);

  const fetchBottomCategories = useCallback(async (parent) => {
    if (!parent) {
      setBottomCategories([]);
      return;
    }
    try {
      const response = await axios.get(`${API}/categories?level=2&parent=${parent}`, { withCredentials: true });
      setBottomCategories(response.data);
    } catch (error) {
      console.error("Failed to fetch bottom categories:", error);
    }
  }, [API]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (formData.category) {
      fetchSubcategories(formData.category);
      setFormData(prev => ({ ...prev, subcategory: "", bottom_category: "" }));
    } else {
      setSubcategories([]);
    }
  }, [formData.category, fetchSubcategories]);

  useEffect(() => {
    if (formData.subcategory) {
      fetchBottomCategories(formData.subcategory);
      setFormData(prev => ({ ...prev, bottom_category: "" }));
    } else {
      setBottomCategories([]);
    }
  }, [formData.subcategory, fetchBottomCategories]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      setFormData((prev) => ({ ...prev, image: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!formData.image) {
      toast.error("Please add an image");
      return;
    }
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${API}/items`,
        {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          subcategory: formData.subcategory || null,
          bottom_category: formData.bottom_category || null,
          image: formData.image,
        },
        { withCredentials: true }
      );
      toast.success("Item posted successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to post item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCategory = async () => {
    if (!requestData.category_name.trim()) {
      toast.error("Please enter a category name");
      return;
    }
    if (requestData.category_name.includes(" ")) {
      toast.error("Category name must be a single word");
      return;
    }
    if (!requestData.reason.trim()) {
      toast.error("Please explain why this category should be added");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await axios.post(
        `${API}/category-requests`,
        {
          category_name: requestData.category_name.trim().toLowerCase(),
          parent_category: requestData.parent_category || null,
          reason: requestData.reason.trim(),
        },
        { withCredentials: true }
      );
      toast.success("Category request submitted! An admin will review it.");
      setShowRequestModal(false);
      setRequestData({ category_name: "", parent_category: "", reason: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit request");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="post-item-page">
      <Header />

      <main className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <h1
          className="text-3xl font-bold text-slate-900 mb-8"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          Post an Item
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Item Image *</Label>
            <div
              className={`relative rounded-2xl border-2 border-dashed transition-colors ${
                imagePreview
                  ? "border-transparent"
                  : "border-slate-200 hover:border-indigo-300"
              }`}
            >
              {imagePreview ? (
                <div className="upload-preview aspect-video">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="rounded-2xl"
                    data-testid="image-preview"
                  />
                  <div className="upload-overlay rounded-2xl">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="rounded-full"
                      data-testid="remove-image-btn"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  className="flex flex-col items-center justify-center aspect-video cursor-pointer bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
                  data-testid="image-upload-label"
                >
                  <ImagePlus className="w-12 h-12 text-slate-400 mb-2" />
                  <span className="text-slate-500 font-medium">Click to upload image</span>
                  <span className="text-sm text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="image-input"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="What are you trading?"
              className="bg-slate-50"
              data-testid="title-input"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Add details about condition, what you're looking for in exchange, etc."
              className="bg-slate-50 min-h-[120px]"
              data-testid="description-input"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Category *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRequestModal(true)}
                className="text-indigo-600 hover:text-indigo-700"
                data-testid="request-category-btn"
              >
                <Plus className="w-4 h-4 mr-1" />
                Request New Category
              </Button>
            </div>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="bg-slate-50" data-testid="category-select">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">No categories available</div>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name} className="capitalize">
                      {cat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory */}
          {formData.category && subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Subcategory (optional)</Label>
              <Select
                value={formData.subcategory}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, subcategory: value }))}
              >
                <SelectTrigger className="bg-slate-50" data-testid="subcategory-select">
                  <SelectValue placeholder="Select a subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name} className="capitalize">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Bottom Category */}
          {formData.subcategory && bottomCategories.length > 0 && (
            <div className="space-y-2">
              <Label>Specific Type (optional)</Label>
              <Select
                value={formData.bottom_category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, bottom_category: value }))}
              >
                <SelectTrigger className="bg-slate-50" data-testid="bottom-category-select">
                  <SelectValue placeholder="Select specific type" />
                </SelectTrigger>
                <SelectContent>
                  {bottomCategories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name} className="capitalize">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-full"
              data-testid="submit-item-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 spinner" />
                  Posting...
                </>
              ) : (
                "Post Item"
              )}
            </Button>
          </div>
        </form>
      </main>

      {/* Request Category Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="sm:max-w-md" data-testid="request-category-modal">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "Manrope, sans-serif" }}>
              Request New Category
            </DialogTitle>
            <DialogDescription>
              Submit a request for a new category. An admin will review it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={requestData.category_name}
                onChange={(e) => setRequestData((prev) => ({ ...prev, category_name: e.target.value.replace(/\s/g, '') }))}
                placeholder="Single word (e.g., vehicles)"
                className="bg-slate-50"
                data-testid="request-category-name"
              />
              <p className="text-xs text-slate-500">Must be a single word, no spaces</p>
            </div>

            <div className="space-y-2">
              <Label>Parent Category (optional)</Label>
              <Select
                value={requestData.parent_category}
                onValueChange={(value) => setRequestData((prev) => ({ ...prev, parent_category: value }))}
              >
                <SelectTrigger className="bg-slate-50">
                  <SelectValue placeholder="None (main category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (main category)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name} className="capitalize">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">Leave empty to request a main category</p>
            </div>

            <div className="space-y-2">
              <Label>Why should this category be added? *</Label>
              <Textarea
                value={requestData.reason}
                onChange={(e) => setRequestData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Explain why this category would be useful..."
                className="bg-slate-50 min-h-[100px]"
                data-testid="request-category-reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRequestCategory}
              disabled={isSubmittingRequest}
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="submit-category-request-btn"
            >
              {isSubmittingRequest ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostItem;
