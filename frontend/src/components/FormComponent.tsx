"use client";
import { useState } from "react";
import { Button } from "@/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shadcn/ui/card";
import { useNavigate } from "react-router-dom";
import { Input } from "@/shadcn/ui/input";
import { Label } from "@/shadcn/ui/label";
import { toast } from "sonner";
import { X, Plus, Upload, FileText, Loader2 } from "lucide-react";

export default function ProfileForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    skills: [],
    location: "",
    duration_month: 1,
    interests: [],
    resume: null,
  });

  const [skillInput, setSkillInput] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name || formData.name.length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }

    if (!formData.skills || formData.skills.length === 0) {
      newErrors.skills = "Please add at least one skill.";
    }

    if (!formData.location || formData.location.length < 2) {
      newErrors.location = "Location must be at least 2 characters.";
    }

    if (
      !formData.duration_month ||
      formData.duration_month < 1 ||
      formData.duration_month > 120
    ) {
      newErrors.duration_month = "Duration must be between 1 and 120 months.";
    }

    if (!formData.interests || formData.interests.length === 0) {
      newErrors.interests = "Please add at least one interest.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Extract text from PDF using PDF.js
  // Replace your extractTextFromPDF with this one
  const extractTextFromPDF = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:3000/api/extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to extract text from server");
      }

      const data = await response.json();
      console.log("Extracted text:", data.text);
      return data.text; // backend sends { text: "...extracted text..." }
    } catch (error) {
      console.error("Server extraction error:", error);
      throw error;
    }
  };

  // Call Gemini API to extract structured data
  const extractDataWithGemini = async (text) => {
    try {
      // Replace with your actual Gemini API key
      const API_KEY =
        import.meta.env.VITE_GEMINI_API_KEY ||
        "***REMOVED***";

      if (API_KEY === "YOUR_GEMINI_API_KEY") {
        throw new Error("Please add your Gemini API key");
      }

      const prompt = `Extract the following information from this resume text and return it as a JSON object:
      - name: Full name of the person
      - location: City, state/country (format as "City, Country")
      - skills: Array of technical skills, programming languages, frameworks, tools
      - interests: Based on Skills judge person interest like if person knows python, he might be interested in AI/ML, if knows web dev skills, interested in web dev etc. Return as array of strings
      - duration_months: Based on the experience mentioned in the resume, estimate total duration of time he will available in months don't exceed 2-3 months. If not mentioned, return null.

      Resume text:
      ${text}

      Return only valid JSON in this exact format:
      {
        "name": "string or null",
        "location": "string or null",
        "skills": ["skill1", "skill2"],
        "interests": ["interest1", "interest2"],
        "duration_months": number or null
      }`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates[0].content.parts[0].text;

      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw new Error("Failed to process resume with AI");
    }
  };

  // Auto-fill form with extracted data
  const autoFillForm = (extractedData) => {
    setFormData((prev) => ({
      ...prev,
      name: extractedData.name || prev.name,
      location: extractedData.location || prev.location,
      skills:
        extractedData.skills && extractedData.skills.length > 0
          ? extractedData.skills
          : prev.skills,
      interests:
        extractedData.interests && extractedData.interests.length > 0
          ? extractedData.interests
          : prev.interests,
      duration_month: extractedData.experience_months || prev.duration_month,
    }));

    // Clear any existing errors for fields that were filled
    const newErrors = { ...errors };
    if (extractedData.name) delete newErrors.name;
    if (extractedData.location) delete newErrors.location;
    if (extractedData.skills && extractedData.skills.length > 0)
      delete newErrors.skills;
    if (extractedData.interests && extractedData.interests.length > 0)
      delete newErrors.interests;
    if (extractedData.experience_months) delete newErrors.duration_month;
    setErrors(newErrors);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (PDF only)
      if (file.type !== "application/pdf") {
        toast("Invalid file type", {
          description: "Please upload a PDF file only.",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast("File too large", {
          description: "Please upload a file smaller than 5MB.",
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        resume: file,
      }));

      setIsProcessing(true);

      try {
        // Extract text from PDF
        toast("Processing resume...", {
          description: "Extracting text from PDF...",
        });

        const extractedText = await extractTextFromPDF(file);

        if (!extractedText.trim()) {
          throw new Error("No text found in PDF");
        }

        // Process with Gemini API
        toast("Analyzing resume...", {
          description: "Using AI to extract information...",
        });

        const extractedData = await extractDataWithGemini(extractedText);

        // Auto-fill the form
        autoFillForm(extractedData);

        toast("Resume processed successfully!", {
          description: `${file.name} has been uploaded and form has been auto-filled.`,
        });
      } catch (error) {
        console.error("Error processing resume:", error);
        toast("Error processing resume", {
          description:
            error.message || "Please try again or fill the form manually.",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const removeResume = () => {
    setFormData((prev) => ({
      ...prev,
      resume: null,
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
      // Clear error when user adds a skill
      if (errors.skills) {
        setErrors((prev) => ({
          ...prev,
          skills: "",
        }));
      }
    }
  };

  const removeSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const addInterest = () => {
    if (
      interestInput.trim() &&
      !formData.interests.includes(interestInput.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        interests: [...prev.interests, interestInput.trim()],
      }));
      setInterestInput("");
      // Clear error when user adds an interest
      if (errors.interests) {
        setErrors((prev) => ({
          ...prev,
          interests: "",
        }));
      }
    }
  };

  const removeInterest = (interestToRemove) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.filter(
        (interest) => interest !== interestToRemove
      ),
    }));
  };

  const handleKeyPress = (e, addFunction) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFunction();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      const interestArrtoString = formData.interests.join(", ");
      const duplicateForm = { ...formData, interests: interestArrtoString };
      delete duplicateForm.resume; // Remove resume file from submission data
      console.log(duplicateForm);

      setIsProcessing(true);

      toast("Processing your profile...", {
        description: "Analyzing your information and finding matches...",
      });

      try {
        const payload = duplicateForm;

        toast("Finding your matches...", {
          description:
            "Searching through our database for the best opportunities...",
        });

        const res = await fetch("http://localhost:8000/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        sessionStorage.setItem("matches", JSON.stringify(data.matches || []));

        toast("Matches found successfully!", {
          description: `Found ${
            data.matches?.length || 0
          } perfect matches for you!`,
        });

        setTimeout(() => {
          navigate("/main");
        }, 1000);
      } catch (err) {
        toast("Error finding matches", {
          description: err.message || "Please try again.",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Profile Information
            </CardTitle>
            <CardDescription>
              Please fill out your profile details below. All fields are
              required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="resume">Upload Your Resume (PDF Only)</Label>
                <div className="space-y-3">
                  {formData.resume ? (
                    <div className="flex items-center gap-3 p-3 border border-border rounded-md bg-secondary/50">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {formData.resume.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(formData.resume.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {isProcessing && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing...
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeResume}
                        className="h-8 w-8 p-0"
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        id="resume"
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isProcessing}
                      />
                      <div className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-md hover:border-primary/50 transition-colors cursor-pointer">
                        {isProcessing ? (
                          <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {isProcessing
                              ? "Processing resume..."
                              : "Upload your resume"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PDF only (max 5MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload your resume to auto-fill the form fields using AI
                  extraction.
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    or fill manually
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is your display name.
                  </p>
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skills">Skills</Label>
                  <div className="space-y-3">
                    {/* Display existing skills as tags */}
                    {formData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                          >
                            <span>{skill}</span>
                            <button
                              type="button"
                              onClick={() => removeSkill(skill)}
                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Input for adding new skills */}
                    <div className="flex gap-2">
                      <Input
                        id="skills"
                        placeholder="Add a skill"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, addSkill)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addSkill}
                        disabled={!skillInput.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add your technical skills, programming languages,
                    frameworks, etc.
                  </p>
                  {errors.skills && (
                    <p className="text-sm text-destructive">{errors.skills}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="City, Country"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Your current location or preferred work location.
                  </p>
                  {errors.location && (
                    <p className="text-sm text-destructive">
                      {errors.location}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_month">Duration (Months)</Label>
                  <Input
                    id="duration_month"
                    name="duration_month"
                    type="number"
                    placeholder="12"
                    min="1"
                    max="120"
                    value={formData.duration_month}
                    onChange={handleInputChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    How many months of availability do you have?
                  </p>
                  {errors.duration_month && (
                    <p className="text-sm text-destructive">
                      {errors.duration_month}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests">Interests</Label>
                  <div className="space-y-3">
                    {/* Display existing interests as tags */}
                    {formData.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.interests.map((interest, index) => (
                          <div
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                          >
                            <span>{interest}</span>
                            <button
                              type="button"
                              onClick={() => removeInterest(interest)}
                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Input for adding new interests */}
                    <div className="flex gap-2">
                      <Input
                        id="interests"
                        placeholder="Add an interest"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, addInterest)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={addInterest}
                        disabled={!interestInput.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add your personal interests, hobbies, or areas you're
                    passionate about.
                  </p>
                  {errors.interests && (
                    <p className="text-sm text-destructive">
                      {errors.interests}
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full cursor-pointer"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finding Your Matches...
                    </>
                  ) : (
                    "Submit Profile"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
