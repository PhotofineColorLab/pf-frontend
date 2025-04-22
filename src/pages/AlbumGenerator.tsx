import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getOrderById, updateOrderStatus, saveAlbumPages } from "@/lib/services/orderService";
import { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, ArrowLeft, ArrowRight, ArrowUpDown, Image } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { getCurrentUser } from "@/lib/services/userService";

interface AlbumImage {
  id: string;
  file: File;
  preview: string;
}

const AlbumGenerator = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [user, setUser] = useState(getCurrentUser());
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        if (!id) {
          toast({
            title: "Error",
            description: "Order ID is missing",
            variant: "destructive",
          });
          navigate("/orders");
          return;
        }
        
        const data = await getOrderById(id);
        setOrder(data);
        
        if (data.status !== "GeneratingAlbum") {
          toast({
            title: "Invalid Order Status",
            description: "This order is not in the album generation phase",
            variant: "destructive",
          });
          navigate("/orders");
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        });
        navigate("/orders");
      } finally {
        setLoading(false);
      }
    };
    
    loadOrder();
    
    // Cleanup function to revoke object URLs
    return () => {
      images.forEach(image => URL.revokeObjectURL(image.preview));
    };
  }, [id, navigate, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newImages: AlbumImage[] = Array.from(e.target.files).map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (id: string) => {
    const imageToRemove = images.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    
    setImages(prev => prev.filter(img => img.id !== id));
    
    // If removed image was the cover, reset cover to first image
    if (images[coverIndex].id === id) {
      setCoverIndex(0);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setImages(items);
    
    // Update cover index if the cover image was moved
    if (coverIndex === result.source.index) {
      setCoverIndex(result.destination.index);
    }
    // If an image was moved before the cover, increment cover index
    else if (
      result.destination.index <= coverIndex && 
      result.source.index > coverIndex
    ) {
      setCoverIndex(prev => prev + 1);
    } 
    // If an image was moved after the cover, decrement cover index
    else if (
      result.destination.index > coverIndex && 
      result.source.index <= coverIndex
    ) {
      setCoverIndex(prev => prev - 1);
    }
  };

  const handleSetCover = (index: number) => {
    setCoverIndex(index);
  };

  const handleCompleteAlbum = async () => {
    if (images.length === 0) {
      toast({
        title: "No Images",
        description: "Please add at least one image to create the album",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Save actual image data as base64 strings - optimized for storage
      const albumPages = images.map((image, index) => {
        return {
          id: image.id,
          isSelected: index === coverIndex, // Mark if this is the cover photo
          dataUrl: image.preview, // Use the image preview URL
          position: index, // Store the position for proper sequence
        };
      });
      
      // Store album data in localStorage
      const albumData = {
        id,
        name: order?.albumName || "Digital Album",
        coverIndex,
        createdAt: new Date().toISOString(),
        pages: albumPages,
      };
      
      // Store album data in localStorage
      localStorage.setItem(`album_${id}`, JSON.stringify(albumData));
      
      // Save album pages to the server as well
      if (id) {
        console.log("Saving album pages to server");
        await saveAlbumPages(id, albumPages, coverIndex);
        console.log("Album pages saved to server successfully");
        
        // Update order status without showing a toast
        await updateOrderStatus(id, "Completed");
        
        toast({
          title: "Album Created",
          description: "Album has been created and saved to the server",
        });
        
        // Redirect based on user role
        if (isAdmin) {
          navigate("/admin");
        } else {
          navigate("/orders");
        }
      }
    } catch (error) {
      console.error("Error creating album:", error);
      toast({
        title: "Error",
        description: "Failed to create the album",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openViewer = () => {
    if (images.length === 0) {
      toast({
        title: "No Images",
        description: "Please add at least one image to preview the album",
        variant: "destructive",
      });
      return;
    }
    
    setCurrentImageIndex(0);
    setViewerOpen(true);
  };

  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-96 flex items-center justify-center">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Album Generator</h1>
          <Button variant="outline" onClick={() => navigate("/orders")}>
            Back to Orders
          </Button>
        </div>

        {order && (
          <Card>
            <CardHeader>
              <CardTitle>Creating Album: {order.albumName}</CardTitle>
              <CardDescription>Upload images, arrange them, and select a cover page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="images">Upload Images</Label>
                <Input 
                  id="images" 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleFileChange} 
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Upload multiple images to create your album (JPG, PNG)
                </p>
              </div>

              {/* Image Gallery & Sequence */}
              {images.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Gallery ({images.length} images)</h3>
                    <div className="space-x-2">
                      <Button variant="outline" onClick={openViewer}>
                        Preview Album
                      </Button>
                    </div>
                  </div>
                  
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="images" direction="horizontal">
                      {(provided) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                        >
                          {images.map((image, index) => (
                            <Draggable key={image.id} draggableId={image.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`relative group border rounded-md overflow-hidden ${
                                    index === coverIndex ? "ring-2 ring-primary" : ""
                                  }`}
                                >
                                  <div className="aspect-[4/3] w-full relative">
                                    <img 
                                      src={image.preview} 
                                      alt={`Album page ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    {index === coverIndex && (
                                      <div className="absolute top-0 left-0 px-2 py-1 bg-primary text-primary-foreground text-xs">
                                        Cover
                                      </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="secondary" 
                                          size="sm"
                                          onClick={() => handleSetCover(index)}
                                          className="text-xs"
                                        >
                                          Set as Cover
                                        </Button>
                                        <Button 
                                          variant="destructive" 
                                          size="sm"
                                          onClick={() => handleRemoveImage(image.id)}
                                          className="text-xs"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-2 bg-muted/30 text-center">
                                    <span className="text-xs">Page {index + 1}</span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                  
                  <div className="text-sm text-muted-foreground text-center">
                    <p>Drag and drop images to reorder them. Click on an image to set it as the cover.</p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate("/orders")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCompleteAlbum}
                disabled={loading || images.length === 0}
              >
                Complete Album
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
      
      {/* Album Viewer */}
      {viewerOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center">
            <h3 className="text-white text-xl">Album Preview</h3>
            <Button variant="outline" onClick={() => setViewerOpen(false)}>
              Close
            </Button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-4xl aspect-[4/3] bg-black">
              <img 
                src={images[currentImageIndex].preview} 
                alt={`Page ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="mt-4 flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={prevImage}
                disabled={currentImageIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <span className="text-white">
                Page {currentImageIndex + 1} of {images.length}
                {currentImageIndex === coverIndex && " (Cover)"}
              </span>
              <Button 
                variant="outline" 
                onClick={nextImage}
                disabled={currentImageIndex === images.length - 1}
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AlbumGenerator;