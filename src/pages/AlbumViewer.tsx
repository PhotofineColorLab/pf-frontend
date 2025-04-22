import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicAlbumById } from "@/lib/services/orderService";
import { ArrowLeft, ArrowRight, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Fallback colors in case no images are available
const FALLBACK_COLORS = [
  "#0066cc", // Cover - Blue
  "#cc0000", // Page 1 - Red
  "#00cc00", // Page 2 - Green
  "#cc6600", // Page 3 - Orange
  "#6600cc", // Page 4 - Purple
  "#cc00cc", // Page 5 - Magenta
  "#00cccc", // Page 6 - Cyan
];

interface AlbumPage {
  id: string;
  dataUrl: string;
  isSelected: boolean;
  position: number;
}

interface Album {
  id: string;
  name: string;
  coverIndex: number;
  createdAt: string;
  pages: AlbumPage[];
}

const AlbumViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [albumName, setAlbumName] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [albumPages, setAlbumPages] = useState<AlbumPage[]>([]);
  const [usingFallback, setUsingFallback] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'next' | 'prev' | null>(null);
  const albumContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadAlbum = async () => {
      try {
        setLoading(true);
        
        if (!id) {
          toast({
            title: "Error",
            description: "Album ID is missing",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        // Step 1: Try to load album data from localStorage first (this has the full album data)
        const storedAlbumData = localStorage.getItem(`album_${id}`);
        
        if (storedAlbumData) {
          console.log("Loading album from localStorage");
          // Parse stored album data
          try {
            const albumData = JSON.parse(storedAlbumData) as Album;
            setAlbumName(albumData.name);
            
            if (albumData.pages && albumData.pages.length > 0) {
              // Sort pages by position to ensure correct order
              const sortedPages = [...albumData.pages].sort((a, b) => a.position - b.position);
              setAlbumPages(sortedPages);
              setTotalPages(sortedPages.length);
              setUsingFallback(false);
            } else {
              // Fallback if album has no pages
              console.log("Album has no pages, using fallback");
              setTotalPages(FALLBACK_COLORS.length);
              setUsingFallback(true);
            }
          } catch (parseError) {
            console.error("Error parsing stored album data:", parseError);
            // Continue to public API if localStorage data is corrupted
          }
        } else {
          // Step 2: If not in localStorage, try to get public album data
          console.log("Album not found in localStorage, trying public API");
          try {
            const publicAlbumData = await getPublicAlbumById(id);
            
            if (publicAlbumData) {
              console.log("Got public album data:", publicAlbumData);
              setAlbumName(publicAlbumData.albumName || "Digital Album");
              setTotalPages(FALLBACK_COLORS.length);
              setUsingFallback(true);
            } else {
              // If we can't get album data, use a generic fallback
              console.log("No public album data, using generic fallback");
              setAlbumName("Photo Album");
              setTotalPages(FALLBACK_COLORS.length);
              setUsingFallback(true);
            }
          } catch (apiError) {
            console.error("Error fetching public album data:", apiError);
            // Use generic fallback if API call fails
            setAlbumName("Photo Album");
            setTotalPages(FALLBACK_COLORS.length);
            setUsingFallback(true);
          }
        }
        
        setTimeout(() => {
          setLoading(false);
        }, 500);
      } catch (error) {
        console.error("Failed to load album:", error);
        toast({
          title: "Error",
          description: "Failed to load album data",
          variant: "destructive",
        });
        
        // Use fallback album rather than redirecting
        setAlbumName("Photo Album");
        setTotalPages(FALLBACK_COLORS.length);
        setUsingFallback(true);
        setLoading(false);
      }
    };
    
    loadAlbum();
  }, [id, navigate, toast]);

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      // Apply animation
      setAnimationDirection('next');
      
      // Reset album content position
      if (albumContentRef.current) {
        albumContentRef.current.style.animation = 'none';
        // Force reflow
        void albumContentRef.current.offsetWidth;
        albumContentRef.current.style.animation = 'turnPageForward 0.5s ease-in-out';
      }
      
      // Set current page after a slight delay
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setAnimationDirection(null);
      }, 250);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      // Apply animation
      setAnimationDirection('prev');
      
      // Reset album content position
      if (albumContentRef.current) {
        albumContentRef.current.style.animation = 'none';
        // Force reflow
        void albumContentRef.current.offsetWidth;
        albumContentRef.current.style.animation = 'turnPageBackward 0.5s ease-in-out';
      }
      
      // Set current page after a slight delay
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setAnimationDirection(null);
      }, 250);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") {
      nextPage();
    } else if (event.key === "ArrowLeft") {
      prevPage();
    } else if (event.key === "Escape" && fullscreen) {
      setFullscreen(false);
    } else if (event.key === "f") {
      setFullscreen(!fullscreen);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentPage, totalPages, fullscreen]);

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const shareAlbum = () => {
    if (navigator.share) {
      navigator.share({
        title: albumName,
        text: `Check out my digital album: ${albumName}`,
        url: window.location.href,
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Album link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading album...</div>
      </div>
    );
  }

  if (totalPages === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <Card className="p-6 max-w-md">
          <h2 className="text-xl font-bold mb-4">Album Not Found</h2>
          <p className="mb-6">The digital album you're looking for is not available.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </Card>
      </div>
    );
  }

  const viewerClasses = fullscreen ? "fixed inset-0 z-50 bg-black" : "h-screen w-full bg-black";

  // Determine what to render in the album view
  const renderAlbumContent = () => {
    if (usingFallback) {
      // Render fallback colored backgrounds with text
      return (
        <div 
          className="h-full w-full flex items-center justify-center text-white text-3xl font-bold"
          style={{ backgroundColor: FALLBACK_COLORS[currentPage % FALLBACK_COLORS.length] }}
        >
          {currentPage === 0 ? "ALBUM COVER" : `PAGE ${currentPage}`}
        </div>
      );
    } else if (albumPages && albumPages.length > 0) {
      // Render the actual album page image
      const currentPageData = albumPages[currentPage];
      return (
        <div className="h-full w-full relative">
          <img
            src={currentPageData.dataUrl}
            alt={`Album page ${currentPage + 1}`}
            className="h-full w-full object-contain"
          />
          {currentPageData.isSelected && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md">
              Cover Photo
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className={viewerClasses}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <h1 className="text-white text-xl font-bold truncate">{albumName}</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-white" onClick={shareAlbum}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button variant="ghost" size="sm" className="text-white" onClick={toggleFullscreen}>
            {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </div>

      {/* Album content */}
      <div className="h-full w-full flex flex-col items-center justify-center relative">
        <div 
          ref={albumContentRef}
          className="relative max-h-[80vh] max-w-[90vw] aspect-[4/3] perspective-1000"
          style={{
            perspective: "1000px"
          }}
        >
          {renderAlbumContent()}
        </div>

        {/* Page turning animations CSS */}
        <style>
          {`
            @keyframes turnPageForward {
              0% {
                transform: rotateY(0deg);
                opacity: 1;
              }
              50% {
                transform: rotateY(90deg);
                opacity: 0.5;
              }
              100% {
                transform: rotateY(0deg);
                opacity: 1;
              }
            }
            
            @keyframes turnPageBackward {
              0% {
                transform: rotateY(0deg);
                opacity: 1;
              }
              50% {
                transform: rotateY(-90deg);
                opacity: 0.5;
              }
              100% {
                transform: rotateY(0deg);
                opacity: 1;
              }
            }
            
            .perspective-1000 {
              perspective: 1000px;
              transform-style: preserve-3d;
            }
          `}
        </style>

        {/* Navigation controls */}
        <div className="absolute inset-x-0 bottom-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent">
          <Button 
            variant="outline" 
            size="sm"
            onClick={prevPage}
            disabled={currentPage === 0}
            className="bg-black/50 text-white border-white/30 hover:bg-black/70"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Previous
          </Button>
          
          <div className="text-white text-sm">
            Page {currentPage + 1} of {totalPages}
            {albumPages[currentPage]?.isSelected && " (Cover)"}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            className="bg-black/50 text-white border-white/30 hover:bg-black/70"
          >
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Side navigation for quick access to pages */}
      <div className="fixed top-1/2 -translate-y-1/2 right-2 flex flex-col gap-1">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full ${
              index === currentPage ? "bg-white" : "bg-white/30"
            }`}
            onClick={() => setCurrentPage(index)}
            title={`Go to page ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default AlbumViewer; 