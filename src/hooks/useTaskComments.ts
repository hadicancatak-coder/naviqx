import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface PendingAttachment {
  type: 'file' | 'link';
  name: string;
  file?: File;
  url?: string;
  size_bytes?: number;
}

interface Comment {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  attachments?: any;
  author?: {
    id: string;
    name: string;
    avatar_url?: string;
    user_id: string;
  } | null;
}

export function useTaskComments(taskId: string, user: User | null) {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    
    const { data: commentsData, error } = await supabase
      .from("comments")
      .select("id, task_id, author_id, body, created_at, attachments")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error || !commentsData) {
      setComments([]);
      return;
    }

    const authorIds = [...new Set(commentsData.map(c => c.author_id))];
    
    if (authorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, user_id")
        .in("user_id", authorIds);

      const commentsWithAuthors = commentsData.map(comment => ({
        ...comment,
        author: profilesData?.find(p => p.user_id === comment.author_id) || null
      }));

      setComments(commentsWithAuthors);
    } else {
      setComments(commentsData);
    }
  }, [taskId]);

  // Fetch users for mentions
  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, user_id, name, username, working_days");
    setUsers(data || []);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchComments();
    fetchUsers();
  }, [taskId, fetchComments, fetchUsers]);

  // Add comment
  const addComment = useCallback(async () => {
    if ((!newComment.trim() && pendingAttachments.length === 0) || !taskId || isSubmitting || !user) return;

    setIsSubmitting(true);
    const commentText = newComment.trim();
    
    try {
      const uploadedAttachments: Array<{type: string; name: string; url: string; size_bytes?: number}> = [];
      
      for (const attachment of pendingAttachments) {
        if (attachment.type === 'file' && attachment.file) {
          const fileName = `${user.id}/${taskId}/${Date.now()}_${attachment.name}`;
          const { error: uploadError } = await supabase.storage
            .from('comment-attachments')
            .upload(fileName, attachment.file);
          
          if (uploadError) {
            toast({ title: "Error", description: `Failed to upload ${attachment.name}`, variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('comment-attachments')
            .getPublicUrl(fileName);
          
          uploadedAttachments.push({
            type: 'file',
            name: attachment.name,
            url: publicUrl,
            size_bytes: attachment.size_bytes
          });
        } else if (attachment.type === 'link' && attachment.url) {
          uploadedAttachments.push({
            type: 'link',
            name: attachment.name,
            url: attachment.url
          });
        }
      }
      
      const { data: newCommentData, error } = await supabase
        .from("comments")
        .insert({ 
          task_id: taskId, 
          author_id: user.id, 
          body: commentText,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : []
        })
        .select('id')
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
        return;
      }

      // Parse @mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = [...commentText.matchAll(mentionRegex)];
      
      if (mentions.length > 0 && newCommentData?.id) {
        const mentionInserts = mentions
          .map(match => {
            const username = match[1].toLowerCase();
            const mentionedUser = users.find(u => 
              u.name?.toLowerCase().replace(/\s+/g, '') === username ||
              u.username?.toLowerCase() === username
            );
            return mentionedUser ? { 
              comment_id: newCommentData.id, 
              mentioned_user_id: mentionedUser.user_id 
            } : null;
          })
          .filter(Boolean);

        if (mentionInserts.length > 0) {
          await supabase.from("comment_mentions").insert(mentionInserts);
        }
      }

      setNewComment("");
      setPendingAttachments([]);
      fetchComments();
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, pendingAttachments, taskId, isSubmitting, user, users, toast, fetchComments]);

  return {
    comments,
    newComment,
    setNewComment,
    isSubmitting,
    addComment,
    pendingAttachments,
    setPendingAttachments,
    users,
    messagesEndRef,
    fetchComments,
  };
}
