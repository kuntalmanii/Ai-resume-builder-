"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle, Trash2, ShieldAlert, Sparkles, MailOpen, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notificationsAPI } from "@/lib/api";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsAPI.list();
      setNotifications(data);
    } catch (err) {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsAPI.markRead(id);
      toast.success("Notification read.");
      fetchNotifications();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      toast.success("All marked read.");
      fetchNotifications();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      toast.success("Notification cleared.");
      fetchNotifications();
    } catch (err) {
      toast.error("Failed to delete notification.");
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              Notification Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay updated on mock interviews schedules, upskilling milestones, and recruiter audits.
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      ) : (
        <Card className="border border-border">
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="font-bold text-foreground text-sm">Inbox clear</h3>
                <p className="text-xs mt-1">No alerts found in your notifications inbox.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {notifications.map((notif) => {
                  const getIcon = () => {
                    switch (notif.notification_type) {
                      case "interview_invite":
                        return <Calendar className="w-4 h-4 text-amber-500" />;
                      case "verif_alert":
                        return <ShieldAlert className="w-4 h-4 text-emerald-500" />;
                      case "sugg_grounded":
                        return <Sparkles className="w-4 h-4 text-indigo-500" />;
                      default:
                        return <Bell className="w-4 h-4 text-slate-500" />;
                    }
                  };

                  return (
                    <div
                      key={notif.id}
                      className={`p-4 flex gap-4 items-start hover:bg-muted/10 transition-colors ${
                        !notif.is_read ? "bg-primary-subtle/5" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0">
                        {getIcon()}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${!notif.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notif.title}
                          </h4>
                          {!notif.is_read && (
                            <Badge className="bg-primary text-primary-foreground text-[8px] font-bold h-4">Unread</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-normal">{notif.message}</p>
                        <span className="text-[10px] text-muted-foreground/60 font-medium block">
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleMarkRead(notif.id)}
                            title="Mark read"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(notif.id)}
                          title="Clear notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
