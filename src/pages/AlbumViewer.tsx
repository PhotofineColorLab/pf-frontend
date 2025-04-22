import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPublicAlbumById, getAlbumPage } from "@/lib/services/orderService";
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
  const [pageInfo, setPageInfo] = useState<{id: string, isSelected: boolean, position: number}[]>([]);
  const [loadedPages, setLoadedPages] = useState<{[position: number]: string}>({});
  const [currentPageLoading, setCurrentPageLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'next' | 'prev' | null>(null);
  const albumContentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadAlbumInfo = async () => {
      try {
        setLoading(true);
        console.log("AlbumViewer: Loading album", id);
        
        if (!id) {
          toast({
            title: "Error",
            description: "Album ID is missing",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
        
        // Step 1: Try to load album data from localStorage first
        const storedAlbumData = localStorage.getItem(`album_${id}`);
        
        if (storedAlbumData) {
          console.log("AlbumViewer: Found album in localStorage");
          try {
            const albumData = JSON.parse(storedAlbumData) as Album;
            setAlbumName(albumData.name);
            
            if (albumData.pages && albumData.pages.length > 0) {
              console.log("AlbumViewer: Using pages from localStorage");
              const sortedPages = [...albumData.pages].sort((a, b) => a.position - b.position);
              
              // Instead of setting all pages at once, just store page info
              const pagesInfo = sortedPages.map(page => ({
                id: page.id,
                isSelected: page.isSelected,
                position: page.position
              }));
              setPageInfo(pagesInfo);
              
              // Load just the first page
              setLoadedPages({
                [sortedPages[0].position]: sortedPages[0].dataUrl
              });
              
              setTotalPages(sortedPages.length);
              setUsingFallback(false);
              setLoading(false);
              return; // Exit early since we found data in localStorage
            }
          } catch (parseError) {
            console.error("Error parsing stored album data:", parseError);
            // Continue to public API
          }
        }
        
        // Step 2: If localStorage failed, try to get album info from server
        console.log("AlbumViewer: Fetching album from server");
        const publicAlbumData = await getPublicAlbumById(id);
        
        if (publicAlbumData && publicAlbumData.pageInfo && publicAlbumData.pageInfo.length > 0) {
          console.log("AlbumViewer: Using pages from server", publicAlbumData);
          setAlbumName(publicAlbumData.albumName || "Digital Album");
          
          // Sort the album pages by position
          const sortedPages = [...publicAlbumData.pageInfo].sort((a, b) => a.position - b.position);
          
          // Set page info for all pages 
          const pagesInfo = sortedPages.map(page => ({
            id: page.id,
            isSelected: page.isSelected,
            position: page.position
          }));
          setPageInfo(pagesInfo);
          
          // Load just the first page
          if (sortedPages[0]?.dataUrl) {
            setLoadedPages({
              [sortedPages[0].position]: sortedPages[0].dataUrl
            });
          } else {
            // Load the first page from the API if dataUrl is not provided
            await loadPageData(publicAlbumData.albumId, sortedPages[0].id, sortedPages[0].position);
          }
          
          setTotalPages(sortedPages.length);
          setUsingFallback(false);
        } else {
          console.log("AlbumViewer: No album pages found, using fallback");
          // If we still don't have data, use fallback
          setAlbumName(publicAlbumData?.albumName || "Photo Album");
          setTotalPages(FALLBACK_COLORS.length);
          setUsingFallback(true);
        }
        
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
      } finally {
        setLoading(false);
      }
    };
    
    loadAlbumInfo();
  }, [id, navigate, toast]);

  // Function to load a specific page data
  const loadPageData = async (albumId: string, pageId: string, position: number) => {
    if (!albumId || !pageId) return;
    
    try {
      setCurrentPageLoading(true);
      const pageData = await getAlbumPage(albumId, pageId);
      
      if (pageData && pageData.dataUrl) {
        setLoadedPages(prev => ({
          ...prev,
          [position]: pageData.dataUrl
        }));
      }
    } catch (error) {
      console.error(`Failed to load page ${pageId}:`, error);
    } finally {
      setCurrentPageLoading(false);
    }
  };

  // Preload the next and previous pages
  useEffect(() => {
    if (usingFallback || !id || pageInfo.length === 0) return;
    
    const preloadAdjacentPages = async () => {
      // Find next and previous page indices
      const nextPageIndex = currentPage + 1;
      const prevPageIndex = currentPage - 1;
      
      // Preload next page if it exists and isn't already loaded
      if (nextPageIndex < totalPages && !loadedPages[pageInfo[nextPageIndex]?.position]) {
        const nextPage = pageInfo[nextPageIndex];
        loadPageData(id, nextPage.id, nextPage.position);
      }
      
      // Preload previous page if it exists and isn't already loaded
      if (prevPageIndex >= 0 && !loadedPages[pageInfo[prevPageIndex]?.position]) {
        const prevPage = pageInfo[prevPageIndex];
        loadPageData(id, prevPage.id, prevPage.position);
      }
    };
    
    preloadAdjacentPages();
  }, [currentPage, id, pageInfo, totalPages, loadedPages, usingFallback]);

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
    } else if (pageInfo && pageInfo.length > 0) {
      const currentPageInfo = pageInfo[currentPage];
      
      if (!currentPageInfo) {
        return (
          <div className="h-full w-full flex items-center justify-center text-white">
            Page information not available
          </div>
        );
      }
      
      // Check if we've loaded this page
      const pageDataUrl = loadedPages[currentPageInfo.position];
      
      if (!pageDataUrl && !currentPageLoading) {
        // If page not loaded and not currently loading, trigger load
        if (id) {
          loadPageData(id, currentPageInfo.id, currentPageInfo.position);
        }
        
        return (
          <div className="h-full w-full flex items-center justify-center text-white">
            Loading page...
          </div>
        );
      } else if (!pageDataUrl && currentPageLoading) {
        return (
          <div className="h-full w-full flex items-center justify-center text-white">
            Loading page...
          </div>
        );
      }
      
      // Render the actual album page image
      return (
        <div className="h-full w-full relative">
          <img
            src={pageDataUrl}
            alt={`Album page ${currentPage + 1}`}
            className="h-full w-full object-contain"
          />
          {currentPageInfo.isSelected && (
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
            {pageInfo[currentPage]?.isSelected && " (Cover)"}
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