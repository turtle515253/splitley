import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGroups } from '@/hooks/useGroups';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Plus, ChevronRight, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewGroupDialog } from '@/components/groups/NewGroupDialog';

const Groups = () => {
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  
  const { data: groups = [], isLoading } = useGroups();
  
  const handleGroupClick = (groupId: string) => {
    navigate(`/groups/${groupId}`);
  };
  
  return (
    <AppLayout>
      <div className="safe-top">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Groups</h1>
            <Button size="sm" onClick={() => setShowNewGroupDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Group
            </Button>
          </div>
        </header>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Groups List */}
        {!isLoading && (
          <div className="px-5 space-y-3 pb-8">
            {groups.map((group, index) => (
              <Card 
                key={group.id} 
                className={cn(
                  "cursor-pointer hover:shadow-elevated transition-all duration-200 animate-slide-up"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleGroupClick(group.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl">
                        {group.emoji || '👥'}
                      </div>
                      <div>
                        <h3 className="font-semibold">{group.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex -space-x-2">
                            {group.members.slice(0, 3).map((member) => (
                              <Avatar key={member.id} className="h-5 w-5 border-2 border-card">
                                <AvatarImage src={member.avatar_url || undefined} />
                                <AvatarFallback className="text-[8px]">
                                  {(member.display_name || member.email || '?')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold">{formatCurrency(group.totalExpenses)}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Empty State */}
            {groups.length === 0 && (
              <Card className="py-12">
                <CardContent className="text-center">
                  <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <h3 className="font-semibold mb-1">No groups yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a group to start splitting expenses with friends
                  </p>
                  <Button onClick={() => setShowNewGroupDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Create Group
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      <NewGroupDialog 
        open={showNewGroupDialog} 
        onOpenChange={setShowNewGroupDialog} 
      />
    </AppLayout>
  );
};

export default Groups;
