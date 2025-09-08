// "use client";

// import { Button } from "@/shadcn/ui/button";
// import { Card, CardDescription, CardHeader, CardTitle } from "@/shadcn/ui/card";
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarHeader,
//   SidebarInset,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarProvider,
//   SidebarTrigger,
// } from "@/shadcn/ui/sidebar";
// import {
//   Target,
//   BookOpen,
//   Bookmark,
//   Send,
//   User,
//   Settings,
//   MapPin,
//   Clock,
//   Loader2,
// } from "lucide-react";
// import { useState, useEffect } from "react";

// export default function MainScreen() {
//   const [jobListings, setJobListings] = useState([]);
//   const [userName, setUserName] = useState("User");
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const loadData = async () => {
//       setIsLoading(true);

//       const storedMatches = sessionStorage.getItem("matches");
//       const storedUserData = sessionStorage.getItem("userData");

//       if (storedMatches) {
//         try {
//           const matches = JSON.parse(storedMatches);
//           console.log("[v0] Raw matches data:", matches);

//           const formattedJobs = matches.map((item, index) => ({
//             id: index,
//             title: item.internship?.title || "Unknown Position",
//             company: item.internship?.organization || "Unknown Company",
//             description:
//               item.internship?.description || "No description available",
//             location: item.internship?.location || "Location not specified",
//             duration: item.internship?.duration_months
//               ? `${item.internship.duration_months} months`
//               : "Duration not specified",
//             stipend: item.internship?.stipend
//               ? `₹${item.internship.stipend}`
//               : "Stipend not mentioned",
//             skills: item.internship?.skills_required || [],
//             matchScore: Math.round(item.match?.score || 0),
//           }));

//           console.log("[v0] Formatted jobs:", formattedJobs);
//           setJobListings(formattedJobs);
//         } catch (error) {
//           console.error("Error parsing matches data:", error);
//           setJobListings([]);
//         }
//       }

//       if (storedUserData) {
//         try {
//           const userData = JSON.parse(storedUserData);
//           setUserName(userData.name || "User");
//         } catch (error) {
//           console.error("Error parsing user data:", error);
//         }
//       }

//       setTimeout(() => {
//         setIsLoading(false);
//       }, 1000);
//     };

//     loadData();
//   }, []);

//   const sidebarItems = [
//     { icon: Target, label: "Top Matches", active: true },
//     { icon: BookOpen, label: "Interview Prep", active: false },
//     { icon: Bookmark, label: "Saved", active: false },
//     { icon: Send, label: "Applied", active: false },
//     { icon: User, label: "Profile", active: false },
//     { icon: Settings, label: "Settings", active: false },
//   ];

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen w-full">
//         <Sidebar className="border-r">
//           <SidebarHeader className="border-b px-6 py-4">
//             <h1 className="text-2xl font-bold">InternSetu</h1>
//           </SidebarHeader>

//           <SidebarContent className="px-4 py-4">
//             <SidebarMenu className="space-y-2">
//               {sidebarItems.map((item, index) => (
//                 <SidebarMenuItem key={index}>
//                   <SidebarMenuButton
//                     isActive={item.active}
//                     className="w-full justify-start gap-3"
//                   >
//                     <item.icon className="w-5 h-5" />
//                     <span>{item.label}</span>
//                   </SidebarMenuButton>
//                 </SidebarMenuItem>
//               ))}
//             </SidebarMenu>
//           </SidebarContent>

//           <SidebarFooter className="border-t p-4">
//             <Button variant="ghost" size="icon">
//               <Settings className="w-5 h-5" />
//             </Button>
//           </SidebarFooter>
//         </Sidebar>

//         <SidebarInset className="flex-1">
//           <div className="flex-1 p-8">
//             <div className="flex items-center gap-4 mb-8">
//               <SidebarTrigger />
//               <h2 className="text-3xl font-bold">Top Matches for {userName}</h2>
//             </div>

//             <div className="max-w-4xl space-y-6">
//               {isLoading ? (
//                 <div className="flex flex-col items-center justify-center py-12">
//                   <Loader2 className="w-8 h-8 animate-spin mb-4" />
//                   <p className="text-lg font-medium">Loading your matches...</p>
//                   <p className="text-sm text-muted-foreground">
//                     Finding the best opportunities for you
//                   </p>
//                 </div>
//               ) : jobListings.length === 0 ? (
//                 <Card className="p-8 text-center">
//                   <CardHeader>
//                     <CardTitle>No matches found</CardTitle>
//                     <CardDescription>
//                       Please complete the profile form to see your job matches.
//                     </CardDescription>
//                   </CardHeader>
//                 </Card>
//               ) : (
//                 jobListings.map((job, index) => (
//                   <Card
//                     key={job.id || index}
//                     className="hover:shadow-md transition-shadow"
//                   >
//                     <CardHeader>
//                       <div className="flex items-start justify-between">
//                         <div className="flex-1">
//                           <div className="flex items-center justify-between mb-2">
//                             <CardTitle className="text-xl">
//                               {job.title}
//                             </CardTitle>
//                             <div className="flex items-center gap-2">
//                               <span className="text-xs text-muted-foreground">
//                                 Match Score
//                               </span>
//                               <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
//                                 {job.matchScore}%
//                               </span>
//                             </div>
//                           </div>
//                           <CardDescription className="font-medium mb-3">
//                             {job.company}
//                           </CardDescription>
//                           <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
//                             {job.description}
//                           </p>
//                           <div className="mb-3">
//                             <span className="text-sm font-medium text-foreground">
//                               Skills Required:{" "}
//                             </span>
//                             <div className="flex flex-wrap gap-1 mt-1">
//                               {(Array.isArray(job.skills)
//                                 ? job.skills
//                                 : job.skills?.split(",") || []
//                               ).map((skill, skillIndex) => (
//                                 <span
//                                   key={skillIndex}
//                                   className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
//                                 >
//                                   {typeof skill === "string"
//                                     ? skill.trim()
//                                     : skill}
//                                 </span>
//                               ))}
//                             </div>
//                           </div>
//                           <div className="flex items-center gap-6 text-muted-foreground text-sm">
//                             <div className="flex items-center gap-1">
//                               <MapPin className="w-4 h-4" />
//                               <span>{job.location}</span>
//                             </div>
//                             <div className="flex items-center gap-1">
//                               <Clock className="w-4 h-4" />
//                               <span>{job.duration}</span>
//                             </div>
//                             <div className="font-semibold text-foreground">
//                               {job.stipend}
//                             </div>
//                           </div>
//                         </div>
//                         <div className="flex gap-2 ml-6">
//                           <Button variant="outline">Save</Button>
//                           <Button variant="default">Apply</Button>
//                         </div>
//                       </div>
//                     </CardHeader>
//                   </Card>
//                 ))
//               )}
//             </div>
//           </div>
//         </SidebarInset>
//       </div>
//     </SidebarProvider>
//   );
// }

// //-------------------------------------------------------NEW CODE ---------------------------------------------------------------------------------
// "use client";

// import { Button } from "@/shadcn/ui/button";
// import { Card, CardDescription, CardHeader, CardTitle } from "@/shadcn/ui/card";
// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarHeader,
//   SidebarInset,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarProvider,
//   SidebarTrigger,
// } from "@/shadcn/ui/sidebar";
// import {
//   Target,
//   BookOpen,
//   Bookmark,
//   Send,
//   User,
//   Settings,
//   MapPin,
//   Clock,
//   Loader2,
// } from "lucide-react";
// import { useState, useEffect } from "react";
// import { useNavigate, useLocation } from "react-router-dom";

// export default function MainScreen() {
//   const [jobListings, setJobListings] = useState([]);
//   const [userName, setUserName] = useState("User");
//   const [isLoading, setIsLoading] = useState(true);

//   const navigate = useNavigate();
//   const location = useLocation();

//   useEffect(() => {
//     const loadData = async () => {
//       setIsLoading(true);

//       const storedMatches = sessionStorage.getItem("matches");
//       const storedUserData = sessionStorage.getItem("userData");

//       if (storedMatches) {
//         try {
//           const matches = JSON.parse(storedMatches);
//           console.log("[v0] Raw matches data:", matches);

//           const formattedJobs = matches.map((item, index) => ({
//             id: index,
//             title: item.internship?.title || "Unknown Position",
//             company: item.internship?.organization || "Unknown Company",
//             description:
//               item.internship?.description || "No description available",
//             location: item.internship?.location || "Location not specified",
//             duration: item.internship?.duration_months
//               ? `${item.internship.duration_months} months`
//               : "Duration not specified",
//             stipend: item.internship?.stipend
//               ? `₹${item.internship.stipend}`
//               : "Stipend not mentioned",
//             skills: item.internship?.skills_required || [],
//             matchScore: Math.round(item.match?.score || 0),
//           }));

//           console.log("[v0] Formatted jobs:", formattedJobs);
//           setJobListings(formattedJobs);
//         } catch (error) {
//           console.error("Error parsing matches data:", error);
//           setJobListings([]);
//         }
//       }

//       if (storedUserData) {
//         try {
//           const userData = JSON.parse(storedUserData);
//           setUserName(userData.name || "User");
//         } catch (error) {
//           console.error("Error parsing user data:", error);
//         }
//       }

//       setTimeout(() => {
//         setIsLoading(false);
//       }, 1000);
//     };

//     loadData();
//   }, []);

//   const sidebarItems = [
//     { icon: Target, label: "Top Matches", path: "/matches" },
//     { icon: BookOpen, label: "Interview Prep", path: "/interview-prep" },
//     { icon: Bookmark, label: "Saved", path: "/saved" },
//     { icon: Send, label: "Applied", path: "/applied" },
//     { icon: User, label: "Profile", path: "/profile" },
//     { icon: Settings, label: "Settings", path: "/settings" },
//   ];

//   const handleNavigation = (path) => {
//     navigate(path);
//   };

//   const renderContent = () => {
//     const currentPath = location.pathname;

//     switch (currentPath) {
//       case "/matches":
//       case "/":
//         return (
//           <div className="max-w-4xl space-y-6">
//             {isLoading ? (
//               <div className="flex flex-col items-center justify-center py-12">
//                 <Loader2 className="w-8 h-8 animate-spin mb-4" />
//                 <p className="text-lg font-medium">Loading your matches...</p>
//                 <p className="text-sm text-muted-foreground">
//                   Finding the best opportunities for you
//                 </p>
//               </div>
//             ) : jobListings.length === 0 ? (
//               <Card className="p-8 text-center">
//                 <CardHeader>
//                   <CardTitle>No matches found</CardTitle>
//                   <CardDescription>
//                     Please complete the profile form to see your job matches.
//                   </CardDescription>
//                 </CardHeader>
//               </Card>
//             ) : (
//               jobListings.map((job, index) => (
//                 <Card
//                   key={job.id || index}
//                   className="hover:shadow-md transition-shadow"
//                 >
//                   <CardHeader>
//                     <div className="flex items-start justify-between">
//                       <div className="flex-1">
//                         <div className="flex items-center justify-between mb-2">
//                           <CardTitle className="text-xl">{job.title}</CardTitle>
//                           <div className="flex items-center gap-2">
//                             <span className="text-xs text-muted-foreground">
//                               Match Score
//                             </span>
//                             <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
//                               {job.matchScore}%
//                             </span>
//                           </div>
//                         </div>
//                         <CardDescription className="font-medium mb-3">
//                           {job.company}
//                         </CardDescription>
//                         <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
//                           {job.description}
//                         </p>
//                         <div className="mb-3">
//                           <span className="text-sm font-medium text-foreground">
//                             Skills Required:{" "}
//                           </span>
//                           <div className="flex flex-wrap gap-1 mt-1">
//                             {(Array.isArray(job.skills)
//                               ? job.skills
//                               : job.skills?.split(",") || []
//                             ).map((skill, skillIndex) => (
//                               <span
//                                 key={skillIndex}
//                                 className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
//                               >
//                                 {typeof skill === "string"
//                                   ? skill.trim()
//                                   : skill}
//                               </span>
//                             ))}
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-6 text-muted-foreground text-sm">
//                           <div className="flex items-center gap-1">
//                             <MapPin className="w-4 h-4" />
//                             <span>{job.location}</span>
//                           </div>
//                           <div className="flex items-center gap-1">
//                             <Clock className="w-4 h-4" />
//                             <span>{job.duration}</span>
//                           </div>
//                           <div className="font-semibold text-foreground">
//                             {job.stipend}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="flex gap-2 ml-6">
//                         <Button variant="outline">Save</Button>
//                         <Button variant="default">Apply</Button>
//                       </div>
//                     </div>
//                   </CardHeader>
//                 </Card>
//               ))
//             )}
//           </div>
//         );
//       case "/interview-prep":
//         return (
//           <div>
//             <h1 className="text-2xl font-bold mb-4">Interview Prep</h1>
//             <p className="text-muted-foreground">Coming soon...</p>
//           </div>
//         );
//       case "/saved":
//         return (
//           <div>
//             <h1 className="text-2xl font-bold mb-4">Saved Jobs</h1>
//             <p className="text-muted-foreground">Coming soon...</p>
//           </div>
//         );
//       case "/applied":
//         return (
//           <div>
//             <h1 className="text-2xl font-bold mb-4">Applied Jobs</h1>
//             <p className="text-muted-foreground">Coming soon...</p>
//           </div>
//         );
//       case "/profile":
//         return (
//           <div>
//             <h1 className="text-2xl font-bold mb-4">Profile</h1>
//             <p className="text-muted-foreground">Coming soon...</p>
//           </div>
//         );
//       case "/settings":
//         return (
//           <div>
//             <h1 className="text-2xl font-bold mb-4">Settings</h1>
//             <p className="text-muted-foreground">Coming soon...</p>
//           </div>
//         );
//       default:
//         return (
//           <div className="max-w-4xl space-y-6">
//             {isLoading ? (
//               <div className="flex flex-col items-center justify-center py-12">
//                 <Loader2 className="w-8 h-8 animate-spin mb-4" />
//                 <p className="text-lg font-medium">Loading your matches...</p>
//                 <p className="text-sm text-muted-foreground">
//                   Finding the best opportunities for you
//                 </p>
//               </div>
//             ) : jobListings.length === 0 ? (
//               <Card className="p-8 text-center">
//                 <CardHeader>
//                   <CardTitle>No matches found</CardTitle>
//                   <CardDescription>
//                     Please complete the profile form to see your job matches.
//                   </CardDescription>
//                 </CardHeader>
//               </Card>
//             ) : (
//               jobListings.map((job, index) => (
//                 <Card
//                   key={job.id || index}
//                   className="hover:shadow-md transition-shadow"
//                 >
//                   <CardHeader>
//                     <div className="flex items-start justify-between">
//                       <div className="flex-1">
//                         <div className="flex items-center justify-between mb-2">
//                           <CardTitle className="text-xl">{job.title}</CardTitle>
//                           <div className="flex items-center gap-2">
//                             <span className="text-xs text-muted-foreground">
//                               Match Score
//                             </span>
//                             <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
//                               {job.matchScore}%
//                             </span>
//                           </div>
//                         </div>
//                         <CardDescription className="font-medium mb-3">
//                           {job.company}
//                         </CardDescription>
//                         <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
//                           {job.description}
//                         </p>
//                         <div className="mb-3">
//                           <span className="text-sm font-medium text-foreground">
//                             Skills Required:{" "}
//                           </span>
//                           <div className="flex flex-wrap gap-1 mt-1">
//                             {(Array.isArray(job.skills)
//                               ? job.skills
//                               : job.skills?.split(",") || []
//                             ).map((skill, skillIndex) => (
//                               <span
//                                 key={skillIndex}
//                                 className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
//                               >
//                                 {typeof skill === "string"
//                                   ? skill.trim()
//                                   : skill}
//                               </span>
//                             ))}
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-6 text-muted-foreground text-sm">
//                           <div className="flex items-center gap-1">
//                             <MapPin className="w-4 h-4" />
//                             <span>{job.location}</span>
//                           </div>
//                           <div className="flex items-center gap-1">
//                             <Clock className="w-4 h-4" />
//                             <span>{job.duration}</span>
//                           </div>
//                           <div className="font-semibold text-foreground">
//                             {job.stipend}
//                           </div>
//                         </div>
//                       </div>
//                       <div className="flex gap-2 ml-6">
//                         <Button variant="outline">Save</Button>
//                         <Button variant="default">Apply</Button>
//                       </div>
//                     </div>
//                   </CardHeader>
//                 </Card>
//               ))
//             )}
//           </div>
//         );
//     }
//   };

//   const getPageTitle = () => {
//     const currentPath = location.pathname;
//     switch (currentPath) {
//       case "/matches":
//       case "/":
//         return `Top Matches for ${userName}`;
//       case "/interview-prep":
//         return "Interview Prep";
//       case "/saved":
//         return "Saved Jobs";
//       case "/applied":
//         return "Applied Jobs";
//       case "/profile":
//         return "Profile";
//       case "/settings":
//         return "Settings";
//       default:
//         return `Top Matches for ${userName}`;
//     }
//   };

//   return (
//     <SidebarProvider>
//       <div className="flex h-screen w-full">
//         <Sidebar className="border-r">
//           <SidebarHeader className="border-b px-6 py-4">
//             <h1 className="text-2xl font-bold">InternSetu</h1>
//           </SidebarHeader>

//           <SidebarContent className="px-4 py-4">
//             <SidebarMenu className="space-y-2">
//               {sidebarItems.map((item, index) => (
//                 <SidebarMenuItem key={index}>
//                   <SidebarMenuButton
//                     isActive={location.pathname === item.path}
//                     className="w-full justify-start gap-3"
//                     onClick={() => handleNavigation(item.path)}
//                   >
//                     <item.icon className="w-5 h-5" />
//                     <span>{item.label}</span>
//                   </SidebarMenuButton>
//                 </SidebarMenuItem>
//               ))}
//             </SidebarMenu>
//           </SidebarContent>

//           <SidebarFooter className="border-t p-4">
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={() => handleNavigation("/settings")}
//             >
//               <Settings className="w-5 h-5" />
//             </Button>
//           </SidebarFooter>
//         </Sidebar>

//         <SidebarInset className="flex-1">
//           <div className="flex-1 p-8">
//             <div className="flex items-center gap-4 mb-8">
//               <SidebarTrigger />
//               <h2 className="text-3xl font-bold">{getPageTitle()}</h2>
//             </div>

//             {renderContent()}
//           </div>
//         </SidebarInset>
//       </div>
//     </SidebarProvider>
//   );
// }

//---------------------------------------------------------------------------------
"use client";

import { Button } from "@/shadcn/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shadcn/ui/card";
import { MapPin, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function MainScreen() {
  const [jobListings, setJobListings] = useState([]);
  const [userName, setUserName] = useState("User");
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const storedMatches = sessionStorage.getItem("matches");
      const storedUserData = sessionStorage.getItem("userData");

      if (storedMatches) {
        try {
          const matches = JSON.parse(storedMatches);
          console.log("[v0] Raw matches data:", matches);

          const formattedJobs = matches.map((item, index) => ({
            id: index,
            title: item.internship?.title || "Unknown Position",
            company: item.internship?.organization || "Unknown Company",
            description:
              item.internship?.description || "No description available",
            location: item.internship?.location || "Location not specified",
            duration: item.internship?.duration_months
              ? `${item.internship.duration_months} months`
              : "Duration not specified",
            stipend: item.internship?.stipend
              ? `₹${item.internship.stipend}`
              : "Stipend not mentioned",
            skills: item.internship?.skills_required || [],
            matchScore: Math.round(item.match?.score || 0),
          }));

          console.log("[v0] Formatted jobs:", formattedJobs);
          setJobListings(formattedJobs);
        } catch (error) {
          console.error("Error parsing matches data:", error);
          setJobListings([]);
        }
      }

      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setUserName(userData.name || "User");
        } catch (error) {
          console.error("Error parsing user data:", error);
        }
      }

      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    };

    loadData();
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const renderContent = () => {
    const currentPath = location.pathname;

    switch (currentPath) {
      case "/matches":
      case "/":
        return (
          <div className="max-w-4xl space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-lg font-medium">Loading your matches...</p>
                <p className="text-sm text-muted-foreground">
                  Finding the best opportunities for you
                </p>
              </div>
            ) : jobListings.length === 0 ? (
              <Card className="p-8 text-center">
                <CardHeader>
                  <CardTitle>No matches found</CardTitle>
                  <CardDescription>
                    Please complete the profile form to see your job matches.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              jobListings.map((job, index) => (
                <Card
                  key={job.id || index}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-xl">{job.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Match Score
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                              {job.matchScore}%
                            </span>
                          </div>
                        </div>
                        <CardDescription className="font-medium mb-3">
                          {job.company}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {job.description}
                        </p>
                        <div className="mb-3">
                          <span className="text-sm font-medium text-foreground">
                            Skills Required:{" "}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(job.skills)
                              ? job.skills
                              : job.skills?.split(",") || []
                            ).map((skill, skillIndex) => (
                              <span
                                key={skillIndex}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
                              >
                                {typeof skill === "string"
                                  ? skill.trim()
                                  : skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-muted-foreground text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{job.duration}</span>
                          </div>
                          <div className="font-semibold text-foreground">
                            {job.stipend}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-6">
                        <Button variant="outline">Save</Button>
                        <Button variant="default">Apply</Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        );
      case "/interview-prep":
        return (
          <div>
            <h1 className="text-2xl font-bold mb-4">Interview Prep</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case "/saved":
        return (
          <div>
            <h1 className="text-2xl font-bold mb-4">Saved Jobs</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case "/applied":
        return (
          <div>
            <h1 className="text-2xl font-bold mb-4">Applied Jobs</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case "/profile":
        return (
          <div>
            <h1 className="text-2xl font-bold mb-4">Profile</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case "/settings":
        return (
          <div>
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      default:
        return (
          <div className="max-w-4xl space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-lg font-medium">Loading your matches...</p>
                <p className="text-sm text-muted-foreground">
                  Finding the best opportunities for you
                </p>
              </div>
            ) : jobListings.length === 0 ? (
              <Card className="p-8 text-center">
                <CardHeader>
                  <CardTitle>No matches found</CardTitle>
                  <CardDescription>
                    Please complete the profile form to see your job matches.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              jobListings.map((job, index) => (
                <Card
                  key={job.id || index}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-xl">{job.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              Match Score
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                              {job.matchScore}%
                            </span>
                          </div>
                        </div>
                        <CardDescription className="font-medium mb-3">
                          {job.company}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {job.description}
                        </p>
                        <div className="mb-3">
                          <span className="text-sm font-medium text-foreground">
                            Skills Required:{" "}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(Array.isArray(job.skills)
                              ? job.skills
                              : job.skills?.split(",") || []
                            ).map((skill, skillIndex) => (
                              <span
                                key={skillIndex}
                                className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
                              >
                                {typeof skill === "string"
                                  ? skill.trim()
                                  : skill}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-muted-foreground text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{job.duration}</span>
                          </div>
                          <div className="font-semibold text-foreground">
                            {job.stipend}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-6">
                        <Button variant="outline">Save</Button>
                        <Button variant="default">Apply</Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        );
    }
  };

  const getPageTitle = () => {
    const currentPath = location.pathname;
    switch (currentPath) {
      case "/matches":
      case "/":
        return `Top Matches for ${userName}`;
      case "/interview-prep":
        return "Interview Prep";
      case "/saved":
        return "Saved Jobs";
      case "/applied":
        return "Applied Jobs";
      case "/profile":
        return "Profile";
      case "/settings":
        return "Settings";
      default:
        return `Top Matches for ${userName}`;
    }
  };

  return (
    <div className="min-h-screen w-full p-8">
      <div className="mb-8">
        {/* <h2 className="text-3xl font-bold">{getPageTitle()}</h2> */}
      </div>
      {renderContent()}
    </div>
  );
}
