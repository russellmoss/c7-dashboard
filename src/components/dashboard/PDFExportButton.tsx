'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface PDFExportButtonProps {
  periodType: string;
  startDate?: string;
  endDate?: string;
  className?: string;
}

export default function PDFExportButton({ periodType, startDate, endDate, className }: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        periodType,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      });

      const response = await fetch(`/api/export/pdf?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const date = new Date().toISOString().split('T')[0];
      const filename = `milea-kpi-${periodType}-${date}.pdf`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getButtonText = () => {
    if (isGenerating) return 'Generating PDF...';
    return 'Export PDF';
  };

  return (
    <Button
      onClick={handleExportPDF}
      disabled={isGenerating}
      className={className}
      variant="outline"
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      {getButtonText()}
    </Button>
  );
} 