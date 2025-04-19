import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { getCurrentUser, getPhotographers } from "@/lib/services/userService";
import { User } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

const Photographers = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [photographers, setPhotographers] = useState<User[]>([]);
  const [filteredPhotographers, setFilteredPhotographers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user exists and is admin
    if (!currentUser) {
      navigate("/login");
      return;
    }

    if (currentUser.role !== "admin") {
      navigate("/dashboard");
      return;
    }

    loadPhotographers();
  }, [currentUser, navigate]);

  const loadPhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get photographers from MongoDB API
      const users = await getPhotographers();
      
      setPhotographers(users);
      setFilteredPhotographers(users);
    } catch (err) {
      console.error("Error loading photographers:", err);
      setError("Failed to load photographers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (!query) {
      setFilteredPhotographers(photographers);
      return;
    }

    const filtered = photographers.filter(photographer => 
      photographer.name.toLowerCase().includes(query.toLowerCase()) ||
      photographer.email.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredPhotographers(filtered);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Photographers</h1>
          <Button variant="outline" onClick={loadPhotographers} disabled={loading} size="sm" className="sm:size-default">
            Refresh
          </Button>
        </div>

        <div className="relative w-full max-w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search photographers..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        {error && (
          <Card className="bg-destructive/10 border-destructive">
            <CardContent className="p-3 sm:p-4">
              <p className="text-destructive text-sm sm:text-base">{error}</p>
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2" 
                onClick={loadPhotographers}
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card className="p-6 sm:p-8 text-center">
            <p className="text-muted-foreground">Loading photographers...</p>
          </Card>
        ) : filteredPhotographers.length > 0 ? (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            {/* Mobile card view */}
            <div className="block sm:hidden">
              {filteredPhotographers.map((photographer) => (
                <div key={photographer._id || photographer.id} className="p-4 border-b last:border-b-0">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-base">{photographer.name}</h3>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground break-all">{photographer.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground break-all">
                        <span className="inline-block mr-1 opacity-70">ID:</span>
                        {photographer._id || photographer.id}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%] whitespace-nowrap">Name</TableHead>
                    <TableHead className="w-[40%] whitespace-nowrap">Email</TableHead>
                    <TableHead className="w-[30%] whitespace-nowrap">User ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhotographers.map((photographer) => (
                    <TableRow key={photographer._id || photographer.id}>
                      <TableCell className="font-medium py-2 sm:py-4 truncate max-w-[120px] sm:max-w-none">
                        {photographer.name}
                      </TableCell>
                      <TableCell className="py-2 sm:py-4 truncate max-w-[120px] sm:max-w-none">
                        {photographer.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground py-2 sm:py-4 truncate max-w-[100px] sm:max-w-none">
                        {photographer._id || photographer.id}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <Card className="p-6 sm:p-8 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">
              {photographers.length > 0 
                ? "No photographers match your search criteria" 
                : "No photographers registered yet"}
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Photographers;
