import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/App";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, User, Package, Tags } from "lucide-react";

export const GlobalSearch = () => {
  const navigate = useNavigate();
  const { API } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ users: [], items: [], categories: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({ users: [], items: [], categories: [] });
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`${API}/search`, {
        params: { q: searchQuery },
        withCredentials: true,
      });
      setResults(response.data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  }, [API]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSelect = (type, item) => {
    setOpen(false);
    setQuery("");
    
    if (type === "user") {
      navigate(`/profile/${item.user_id}`);
    } else if (type === "item") {
      navigate(`/item/${item.item_id}`);
    } else if (type === "category") {
      navigate(`/dashboard?category=${item.name}`);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
        data-testid="global-search-btn"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search users, items, or categories..."
          value={query}
          onValueChange={setQuery}
          data-testid="search-input"
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? "Searching..." : query.length < 2 ? "Type at least 2 characters..." : "No results found."}
          </CommandEmpty>

          {results.users.length > 0 && (
            <CommandGroup heading="Users">
              {results.users.map((user) => (
                <CommandItem
                  key={user.user_id}
                  onSelect={() => handleSelect("user", user)}
                  className="cursor-pointer"
                  data-testid={`search-user-${user.user_id}`}
                >
                  <Avatar className="h-8 w-8 mr-3">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.username || user.name}</span>
                    <span className="text-xs text-slate-500">{user.trade_points || 0} trade points</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.items.length > 0 && (
            <CommandGroup heading="Items">
              {results.items.map((item) => (
                <CommandItem
                  key={item.item_id}
                  onSelect={() => handleSelect("item", item)}
                  className="cursor-pointer"
                  data-testid={`search-item-${item.item_id}`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden mr-3 bg-slate-100 flex-shrink-0">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">{item.title}</span>
                    <span className="text-xs text-slate-500 capitalize">{item.category}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.categories.length > 0 && (
            <CommandGroup heading="Categories">
              {results.categories.map((cat) => (
                <CommandItem
                  key={cat.name}
                  onSelect={() => handleSelect("category", cat)}
                  className="cursor-pointer"
                  data-testid={`search-category-${cat.name}`}
                >
                  <Tags className="w-4 h-4 mr-3 text-slate-400" />
                  <span className="capitalize">{cat.name}</span>
                  {cat.parent_category && (
                    <span className="text-xs text-slate-400 ml-2">in {cat.parent_category}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
