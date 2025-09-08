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
// } from "lucide-react";
// import axios from "axios";
// import { useEffect } from "react";

// export default function MainScreen() {
//   useEffect(() => {
//     const fetchData = async () => {
//       axios
//         .post(
//           "http://127.0.0.1:8000/match",
//           {
//             name: "Alice",
//             skills: ["python", "sql"],
//             location: "Bangalore",
//             duration_months: 3,
//             interests: "machine learning",
//           },
//           {
//             headers: { "Content-Type": "application/json" }, // optional — axios sets this automatically for objects
//           }
//         )
//         .then((response) => {
//           console.log(response.data);
//         });
//     };

//     fetchData();
//   }, []);
//   const jobListings = [
//     {
//       id: 1,
//       title: "Data Analysis Intern",
//       company: "Ministry of Finance",
//       location: "Remote",
//       duration: "2 months",
//       skills: ["Python", "SQL", "Excel", "Data Visualization"],
//       description:
//         "Analyze government financial data and create comprehensive reports for policy decision-making. Work with large datasets to identify trends and patterns.",
//       stipend: "₹25,000/month",
//       matchScore: 92,
//     },
//     {
//       id: 2,
//       title: "Policy Research Intern",
//       company: "NITI Aayog",
//       location: "New Delhi",
//       duration: "2 months",
//       skills: ["Research", "Policy Analysis", "Report Writing", "Economics"],
//       description:
//         "Conduct research on economic policies and their impact on various sectors. Prepare policy briefs and recommendations for government initiatives.",
//       stipend: "₹30,000/month",
//       matchScore: 87,
//     },
//     {
//       id: 3,
//       title: "Machine Learning Intern",
//       company: "Indian Institute of Technology",
//       location: "Remote",
//       duration: "2 months",
//       skills: ["Python", "TensorFlow", "Machine Learning", "Deep Learning"],
//       description:
//         "Develop and implement machine learning models for research projects. Work on cutting-edge AI applications in collaboration with faculty.",
//       stipend: "₹35,000/month",
//       matchScore: 95,
//     },
//   ];

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
//             <h1 className="text-2xl font-bold">Sarthak</h1>
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
//               <h2 className="text-3xl font-bold">Top Matches for Asha</h2>
//             </div>

//             <div className="max-w-4xl space-y-6">
//               {jobListings.map((job) => (
//                 <Card
//                   key={job.id}
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
//                             {job.skills.map((skill, index) => (
//                               <span
//                                 key={index}
//                                 className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium"
//                               >
//                                 {skill}
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
//               ))}
//             </div>
//           </div>
//         </SidebarInset>
//       </div>
//     </SidebarProvider>
//   );
// }

//-------------------------------------------NEW CODE ---------------------------------------
"use client";

import { Button } from "@/shadcn/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shadcn/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/shadcn/ui/sidebar";
import {
  Target,
  BookOpen,
  Bookmark,
  Send,
  User,
  Settings,
  MapPin,
  Clock,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function MainScreen() {
  const [jobListings, setJobListings] = useState([]);
  const [userName, setUserName] = useState("User");
  const [isLoading, setIsLoading] = useState(true);

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

  const sidebarItems = [
    { icon: Target, label: "Top Matches", active: true },
    { icon: BookOpen, label: "Interview Prep", active: false },
    { icon: Bookmark, label: "Saved", active: false },
    { icon: Send, label: "Applied", active: false },
    { icon: User, label: "Profile", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b px-6 py-4">
            <h1 className="text-2xl font-bold">Sarthak</h1>
          </SidebarHeader>

          <SidebarContent className="px-4 py-4">
            <SidebarMenu className="space-y-2">
              {sidebarItems.map((item, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton
                    isActive={item.active}
                    className="w-full justify-start gap-3"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <div className="flex-1 p-8">
            <div className="flex items-center gap-4 mb-8">
              <SidebarTrigger />
              <h2 className="text-3xl font-bold">Top Matches for {userName}</h2>
            </div>

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
                            <CardTitle className="text-xl">
                              {job.title}
                            </CardTitle>
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
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
