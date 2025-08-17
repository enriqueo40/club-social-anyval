
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './index.css';

// --- DATABASE TYPE DEFINITIONS ---
interface Comment {
    id: number;
    username: string;
    text: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          username: string;
          avatar: string;
          created_at: string;
        };
        Insert: {
          username: string;
          avatar: string;
        };
        Update: {
          avatar?: string;
        };
      };
      posts: {
        Row: {
          id: number;
          userId: string;
          content: string;
          category: string;
          mediaUrl: string | null;
          mediaType: "image" | "video" | null;
          created_at: string;
          likes: string[];
          comments: Comment[];
        };
        Insert: {
          userId: string;
          content: string;
          category: string;
          mediaUrl?: string | null;
          mediaType?: "image" | "video" | null;
          likes: string[];
          comments: Comment[];
        };
        Update: {
          content?: string;
          category?: string;
          mediaUrl?: string | null;
          mediaType?: "image" | "video" | null;
          likes?: string[];
          comments?: Comment[];
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// --- SUPABASE SETUP ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// --- TYPE DEFINITIONS ---
interface User {
    username: string;
    avatar: string; // URL to image or emoji
    created_at?: string;
}

interface Post {
    id: number;
    userId: string;
    content: string;
    category: string;
    mediaUrl: string | null;
    mediaType: 'image' | 'video' | null;
    created_at: string;
    likes: string[];
    comments: Comment[];
}

type View = 'feed' | 'create' | 'profile';
type EditingState = { type: 'post', id: number } | { type: 'comment', postId: number, commentId: number } | { type: 'profile', username: string } | null;


// --- UTILITY FUNCTIONS ---
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const uploadFile = async (file: File, bucketFolder: string): Promise<string> => {
    const filePath = `${bucketFolder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
        .from('media') // Main bucket
        .upload(filePath, file);

    if (error) {
        console.error(`Error uploading file:`, error.message, error);
        throw error;
    }

    const { data } = supabase.storage.from('media').getPublicUrl(filePath);
    return data.publicUrl;
};

// --- COMPONENTS ---

const LoginView = ({ onLogin }: { onLogin: (username: string, avatarFile: File | null) => void }) => {
    const [username, setUsername] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const dataUrl = await fileToDataUrl(file);
            setAvatarPreview(dataUrl);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim()) {
            onLogin(username.trim(), avatarFile);
        }
    };

    return (
        <div style={styles.loginContainer}>
            <h1 style={styles.headerTitle}>Parque recreacional Anyval</h1>
            <p style={styles.loginSubtitle}>Únete a nuestra comunidad. Comparte tus momentos y descubre nuevas aventuras.</p>
            <form onSubmit={handleSubmit} style={styles.loginForm}>
                 <img src={avatarPreview || 'https://via.placeholder.com/100/1a1a1a/00f2ff?text=Avatar'} alt="Avatar preview" style={styles.loginAvatarPreview} />
                <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.loginInput}>
                    Seleccionar foto de perfil
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Escribe tu nombre de usuario"
                    style={styles.loginInput}
                    aria-label="Nombre de usuario"
                />
                <button type="submit" style={username.trim() ? styles.loginButton : styles.loginButtonDisabled} disabled={!username.trim()}>
                    Iniciar Sesión / Registrarse
                </button>
            </form>
        </div>
    );
};

const CreatePostView = ({ onCreatePost, onCancel }: { onCreatePost: (content: string, category: string, mediaFile: File | null) => void, onCancel: () => void }) => {
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const dataUrl = await fileToDataUrl(file);
            setMediaPreview(dataUrl);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (content.trim() || mediaFile) {
            onCreatePost(content, category, mediaFile);
        }
    };

    return (
        <section style={styles.createPostContainer} aria-labelledby="create-post-heading">
            <header style={styles.createPostHeader}>
                 <button onClick={onCancel} style={styles.cancelButton}>Cancelar</button>
                 <h2 id="create-post-heading" style={styles.createPostTitle}>Crear Publicación</h2>
                 <button style={(content.trim() || mediaFile) ? styles.postButton : styles.postButtonDisabled} onClick={handleSubmit} disabled={!(content.trim() || mediaFile)}>Publicar</button>
            </header>
            <textarea style={styles.textarea} value={content} onChange={(e) => setContent(e.target.value)} placeholder="¿Qué aventura viviste hoy?"/>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.categorySelect}>
                    <option>General</option>
                    <option>Tecnología</option>
                    <option>Viajes</option>
                    <option>Comida</option>
                </select>
                <button onClick={() => fileInputRef.current?.click()} style={styles.actionButton}>
                     <span className="material-icons">add_photo_alternate</span> Foto/Video
                </button>
                <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
            {mediaPreview && (
                mediaFile?.type.startsWith('image') ?
                    <img src={mediaPreview} alt="Preview" className="media-preview" /> :
                    <video src={mediaPreview} controls className="media-preview" />
            )}
        </section>
    );
};

const CommentSection = ({ post, currentUser, onAddComment, users, onEditComment }: { post: Post, currentUser: User, onAddComment: (postId: number, text: string) => void, users: User[], onEditComment: (postId: number, commentId: number) => void }) => {
    const [commentText, setCommentText] = useState('');
    const getUserAvatar = (username: string) => users.find(u => u.username === username)?.avatar || '👤';

    return (
        <div style={styles.commentsSection}>
            {post.comments.map(comment => (
                <div key={comment.id} style={styles.comment}>
                    {getUserAvatar(comment.username).startsWith('http') ? <img src={getUserAvatar(comment.username)} alt={comment.username} style={styles.commentAvatarImg} /> : <span style={styles.commentAvatar}>{getUserAvatar(comment.username)}</span>}
                    <div style={styles.commentBody}>
                        <span style={styles.username}>{comment.username}</span>
                        <p style={styles.commentText}>{comment.text}</p>
                    </div>
                     {currentUser.username === comment.username && <OptionsMenu onEdit={() => onEditComment(post.id, comment.id)} />}
                </div>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); if (commentText.trim()) { onAddComment(post.id, commentText); setCommentText(''); } }} style={styles.commentForm}>
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Añade un comentario..." style={styles.commentInput}/>
                <button type="submit" style={styles.commentButton} disabled={!commentText.trim()}><span className="material-icons">send</span></button>
            </form>
        </div>
    );
};

const OptionsMenu = ({ onEdit }: { onEdit: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    
    return (
        <div ref={menuRef} style={{ position: 'relative', marginLeft: 'auto' }}>
            <button onClick={() => setIsOpen(!isOpen)} style={styles.optionsButton}><span className="material-icons">more_horiz</span></button>
            {isOpen && (
                <div style={styles.optionsMenu}>
                    <button onClick={() => { onEdit(); setIsOpen(false); }} style={styles.optionsMenuItem}>Editar</button>
                </div>
            )}
        </div>
    );
};

const PostCard: React.FC<{ post: Post, currentUser: User, onLike: (postId: number) => void, onAddComment: (postId: number, text: string) => void, users: User[], onEditPost: (postId: number) => void, onEditComment: (postId: number, commentId: number) => void }> = ({ post, currentUser, onLike, onAddComment, users, onEditPost, onEditComment }) => {
    const author = useMemo(() => users.find(u => u.username === post.userId), [post.userId, users]);
    const isLiked = post.likes.includes(currentUser.username);

    return (
        <article style={styles.postCard} aria-labelledby={`post-heading-${post.id}`}>
            <header style={styles.postHeader}>
                 {author?.avatar.startsWith('http') ? <img src={author.avatar} alt={author.username} style={styles.avatarImg} /> : <span style={styles.avatar}>{author?.avatar || '👤'}</span>}
                <div>
                    <h3 id={`post-heading-${post.id}`} style={styles.username}>{author?.username || 'Usuario Desconocido'}</h3>
                    <p style={styles.timestamp}>{new Date(post.created_at).toLocaleString()} · <span style={styles.categoryTag}>{post.category}</span></p>
                </div>
                {currentUser.username === post.userId && <OptionsMenu onEdit={() => onEditPost(post.id)} />}
            </header>
            <p style={styles.postContent}>{post.content}</p>
            {post.mediaUrl && (post.mediaType === 'image' ? <img src={post.mediaUrl} alt="Contenido de la publicación" className="post-media" /> : <video src={post.mediaUrl} controls className="post-media" />)}
            <div style={styles.postStats}>
                <span>{post.likes.length > 0 && `${post.likes.length} Me gusta`}</span>
                <span>{post.comments.length > 0 && `${post.comments.length} Comentarios`}</span>
            </div>
            <footer style={styles.postActions}>
                <button style={{...styles.actionButton, color: isLiked ? 'var(--secondary-color)' : 'var(--icon-color)'}} onClick={() => onLike(post.id)}>
                    <span className="material-icons" style={{...styles.actionIcon, textShadow: isLiked ? 'var(--neon-glow-secondary)' : 'none'}}>{isLiked ? 'favorite' : 'favorite_border'}</span> Me gusta
                </button>
                 <button style={styles.actionButton}><span className="material-icons" style={styles.actionIcon}>chat_bubble_outline</span> Comentar</button>
            </footer>
            <CommentSection post={post} currentUser={currentUser} onAddComment={onAddComment} users={users} onEditComment={onEditComment} />
        </article>
    );
};

const ProfileView = ({ currentUser, posts, onLogout, onEditProfile }: { currentUser: User, posts: Post[], onLogout: () => void, onEditProfile: () => void }) => {
    const userPosts = posts.filter(p => p.userId === currentUser.username);
    return (
        <section style={{width: '100%'}}>
            <div style={styles.profileHeader}>
                 {currentUser.avatar.startsWith('http') ? <img src={currentUser.avatar} alt={currentUser.username} style={{...styles.avatarImg, width: '60px', height: '60px'}} /> : <span style={{...styles.avatar, fontSize: '3rem', width: '60px', height: '60px'}}>{currentUser.avatar}</span>}
                 <h2 style={styles.profileUsername}>{currentUser.username}</h2>
                 <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={onEditProfile} style={styles.editProfileButton}>Editar Perfil</button>
                    <button onClick={onLogout} style={styles.logoutButton}>Cerrar Sesión</button>
                 </div>
            </div>
            {userPosts.map(post => (
                 <div key={post.id} style={{...styles.postCard, padding: '12px 16px', marginBottom: '10px'}}>
                     <p style={styles.timestamp}>{new Date(post.created_at).toLocaleString()}</p>
                     <p style={styles.postContent}>{post.content}</p>
                     {post.mediaUrl && <img src={post.mediaUrl} alt="" style={{maxWidth: '100px', borderRadius: '4px', marginTop: '5px'}} />}
                 </div>
            ))}
        </section>
    );
};

const Navbar = ({ activeView, onNavigate }: { activeView: View, onNavigate: (view: View) => void }) => (
    <nav style={styles.navbar}>
        <button style={styles.navButton} onClick={() => onNavigate('feed')}><span className="material-icons" style={{...styles.navIcon, color: activeView === 'feed' ? 'var(--icon-active-color)' : 'var(--icon-color)', textShadow: activeView === 'feed' ? 'var(--neon-glow-primary)' : 'none' }}>home</span></button>
        <button style={styles.navButton} onClick={() => onNavigate('create')}><span className="material-icons" style={{...styles.navIcon, color: activeView === 'create' ? 'var(--icon-active-color)' : 'var(--icon-color)', textShadow: activeView === 'create' ? 'var(--neon-glow-primary)' : 'none' }}>add_circle_outline</span></button>
        <button style={styles.navButton} onClick={() => onNavigate('profile')}><span className="material-icons" style={{...styles.navIcon, color: activeView === 'profile' ? 'var(--icon-active-color)' : 'var(--icon-color)', textShadow: activeView === 'profile' ? 'var(--neon-glow-primary)' : 'none' }}>person</span></button>
    </nav>
);

const EditModal = ({ editing, posts, currentUser, onCancel, onSaveProfile, onSavePost, onSaveComment }: { editing: EditingState, posts: Post[], currentUser: User, onCancel: () => void, onSaveProfile: (newUsername: string, newAvatarFile: File | null) => void, onSavePost: (postId: number, newContent: string, newCategory: string, newMediaFile: File | null, removeMedia: boolean) => void, onSaveComment: (postId: number, commentId: number, newText: string) => void }) => {
    if (!editing) return null;

    if (editing.type === 'profile') {
        const [username, setUsername] = useState(currentUser.username);
        const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar);
        const [avatarFile, setAvatarFile] = useState<File | null>(null);

        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setAvatarFile(file);
                setAvatarPreview(await fileToDataUrl(file));
            }
        };

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContent}>
                    <h2>Editar Perfil</h2>
                    <img src={avatarPreview || ''} alt="Avatar" style={{width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover'}}/>
                    <input type="file" accept="image/*" onChange={handleFileChange} />
                    <input type="text" value={username} readOnly disabled style={{...styles.modalInput, backgroundColor: '#444'}} />
                    <p style={{fontSize: '0.8rem', color: 'var(--secondary-text-color)'}}>El cambio de nombre no está disponible.</p>
                    <div style={styles.modalActions}>
                        <button onClick={onCancel} style={styles.cancelButton}>Cancelar</button>
                        <button onClick={() => onSaveProfile(username, avatarFile)} style={styles.postButton}>Guardar</button>
                    </div>
                </div>
            </div>
        );
    }

    if (editing.type === 'post') {
        const post = posts.find(p => p.id === editing.id);
        const [content, setContent] = useState(post?.content || '');
        const [category, setCategory] = useState(post?.category || 'General');
        const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
        const [mediaPreview, setMediaPreview] = useState<string | null>(post?.mediaUrl || null);
        const [mediaPreviewType, setMediaPreviewType] = useState<'image' | 'video' | null>(post?.mediaType || null);
        const [removeMedia, setRemoveMedia] = useState(false);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setNewMediaFile(file);
                setMediaPreview(await fileToDataUrl(file));
                setMediaPreviewType(file.type.startsWith('image') ? 'image' : 'video');
                setRemoveMedia(false);
            }
        };

        const handleRemoveMedia = () => {
            setNewMediaFile(null);
            setMediaPreview(null);
            setMediaPreviewType(null);
            setRemoveMedia(true);
            if(fileInputRef.current) fileInputRef.current.value = "";
        };

        return (
            <div style={styles.modalOverlay}>
                <div style={styles.modalContent}>
                    <h2>Editar Publicación</h2>
                    <textarea value={content} onChange={(e) => setContent(e.target.value)} style={{...styles.textarea, height: '100px'}} />
                    
                    {mediaPreview && (
                         <div style={{ position: 'relative', marginTop: '10px', alignSelf: 'center' }}>
                            {mediaPreviewType === 'video' ?
                                <video src={mediaPreview} controls className="media-preview" style={{ maxHeight: '150px' }}/> :
                                <img src={mediaPreview} alt="Preview" className="media-preview" style={{ maxHeight: '150px' }}/>
                            }
                        </div>
                    )}

                    <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                         <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.editProfileButton}>
                            {mediaPreview ? 'Cambiar' : 'Añadir Media'}
                         </button>
                         {mediaPreview && <button type="button" onClick={handleRemoveMedia} style={{...styles.logoutButton, color: 'var(--danger-color)', borderColor: 'var(--danger-color)'}}>Quitar</button>}
                    </div>
                    <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} />
                    
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={{...styles.categorySelect, marginTop: '5px'}}>
                        <option>General</option><option>Tecnología</option><option>Viajes</option><option>Comida</option>
                    </select>

                    <div style={styles.modalActions}>
                        <button onClick={onCancel} style={styles.cancelButton}>Cancelar</button>
                        <button onClick={() => onSavePost(editing.id, content, category, newMediaFile, removeMedia)} style={styles.postButton}>Guardar</button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (editing.type === 'comment') {
        const post = posts.find(p => p.id === editing.postId);
        const comment = post?.comments.find(c => c.id === editing.commentId);
        const [text, setText] = useState(comment?.text || '');
        
        return (
             <div style={styles.modalOverlay}>
                <div style={styles.modalContent}>
                    <h2>Editar Comentario</h2>
                    <input type="text" value={text} onChange={(e) => setText(e.target.value)} style={styles.modalInput} />
                    <div style={styles.modalActions}>
                        <button onClick={onCancel} style={styles.cancelButton}>Cancelar</button>
                        <button onClick={() => onSaveComment(editing.postId, editing.commentId, text)} style={styles.postButton}>Guardar</button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};


const App = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<View>('feed');
    const [editing, setEditing] = useState<EditingState>(null);
    const [loading, setLoading] = useState(true);

    const fetchPosts = async () => {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) console.error('Error fetching posts:', error.message, error);
        else setPosts((data as unknown as Post[]) || []);
    };
    
    const fetchUsers = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) console.error('Error fetching users:', error.message, error);
        else setUsers(data || []);
    };
    
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            await Promise.all([fetchPosts(), fetchUsers()]);
            setLoading(false);
        }
        fetchAll();
    }, []);


    const handleLogin = async (username: string, avatarFile: File | null) => {
        setLoading(true);
        const { data: existingUser, error: fetchError } = await supabase.from('users').select('*').eq('username', username).single();
        
        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means 0 rows found, which is fine for a new user.
            console.error('Error fetching user on login:', fetchError.message, fetchError);
            setLoading(false);
            return;
        }

        let userToSet: User;

        if (existingUser) {
            if (avatarFile) {
                const newAvatarUrl = await uploadFile(avatarFile, 'avatars');
                const { data: updatedUser, error: updateError } = await supabase.from('users').update({ avatar: newAvatarUrl }).eq('username', username).select().single();
                if(updateError) {
                     console.error('Error updating avatar:', updateError.message, updateError);
                     setLoading(false);
                     return;
                }
                userToSet = updatedUser!;
            } else {
                userToSet = existingUser;
            }
        } else {
            let avatarUrl = '👤';
            if (avatarFile) {
                avatarUrl = await uploadFile(avatarFile, 'avatars');
            }
            const { data: createdUser, error: createError } = await supabase.from('users').insert({ username, avatar: avatarUrl }).select().single();
             if(createError) {
                 console.error('Error creating user:', createError.message, createError);
                 setLoading(false);
                 return;
            }
            userToSet = createdUser!;
            setUsers(prev => [...prev, createdUser!]); // Optimistic update
        }
        setCurrentUser(userToSet);
        setLoading(false);
    };

    const handleCreatePost = async (content: string, category: string, mediaFile: File | null) => {
        if (!currentUser) return;
        setLoading(true);
        try {
            let mediaUrl: string | undefined | null;
            let mediaType: 'image' | 'video' | undefined | null;

            if (mediaFile) {
                mediaUrl = await uploadFile(mediaFile, 'media');
                mediaType = mediaFile.type.startsWith('image') ? 'image' : 'video';
            }

            const newPost = { userId: currentUser.username, content, category, mediaUrl, mediaType, likes: [], comments: [] };
            const { error } = await supabase.from('posts').insert(newPost);
            if (error) throw error;

            await fetchPosts();
            setCurrentView('feed');
        } catch (error: any) {
            console.error('Error creating post:', error.message, error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleLikePost = async (postId: number) => {
        if (!currentUser) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const currentlyLiked = post.likes.includes(currentUser.username);
        const newLikes = currentlyLiked ? post.likes.filter(u => u !== currentUser.username) : [...post.likes, currentUser.username];
        
        setPosts(posts.map(p => p.id === postId ? { ...p, likes: newLikes } : p)); // Optimistic update

        const { error } = await supabase.from('posts').update({ likes: newLikes }).eq('id', postId);
        if (error) {
            console.error("Error liking post:", error.message, error);
            setPosts(posts.map(p => p.id === postId ? { ...p, likes: post.likes } : p)); // Revert
        }
    };

    const handleAddComment = async (postId: number, text: string) => {
        if (!currentUser) return;
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const newComment: Comment = { id: Date.now(), username: currentUser.username, text };
        const newComments = [...post.comments, newComment];
        
        setPosts(posts.map(p => p.id === postId ? { ...p, comments: newComments } : p)); // Optimistic update

        const { error } = await supabase.from('posts').update({ comments: newComments }).eq('id', postId);
        if (error) {
            console.error("Error adding comment:", error.message, error);
            setPosts(posts.map(p => p.id === postId ? { ...p, comments: post.comments } : p)); // Revert
        }
    };
    
    const handleSavePost = async (postId: number, newContent: string, newCategory: string, newMediaFile: File | null, removeMedia: boolean) => {
        setLoading(true);
        const post = posts.find(p => p.id === postId);
        if (!post) { setLoading(false); return; }

        try {
            let newMediaUrl: string | null | undefined = post.mediaUrl;
            let newMediaType: 'image' | 'video' | null | undefined = post.mediaType;

            if (removeMedia) {
                newMediaUrl = undefined;
                newMediaType = undefined;
            } else if (newMediaFile) {
                newMediaUrl = await uploadFile(newMediaFile, 'media');
                newMediaType = newMediaFile.type.startsWith('image') ? 'image' : 'video';
            }
            
            const { error } = await supabase.from('posts').update({ content: newContent, category: newCategory, mediaUrl: newMediaUrl, mediaType: newMediaType }).eq('id', postId);
            if (error) throw error;
            
            await fetchPosts();
            setEditing(null);
        } catch(e: any) {
            console.error("Error saving post", e.message, e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveComment = async (postId: number, commentId: number, newText: string) => {
        setLoading(true);
        const post = posts.find(p => p.id === postId);
        if (!post) { setLoading(false); return; }

        const newComments = post.comments.map(c => c.id === commentId ? { ...c, text: newText } : c);
        const { error } = await supabase.from('posts').update({ comments: newComments }).eq('id', postId);

        if (error) {
            console.error("Error saving comment", error.message, error);
        } else {
            setPosts(posts.map(p => p.id === postId ? { ...p, comments: newComments } : p));
            setEditing(null);
        }
        setLoading(false);
    };

    const handleSaveProfile = async (username: string, newAvatarFile: File | null) => {
        if (!currentUser || !newAvatarFile) { setEditing(null); return; }
        setLoading(true);

        try {
            const newAvatarUrl = await uploadFile(newAvatarFile, 'avatars');
            const { data: updatedUser, error } = await supabase.from('users').update({ avatar: newAvatarUrl }).eq('username', currentUser.username).select().single();
            if (error) throw error;

            setCurrentUser(updatedUser);
            setUsers(users.map(u => u.username === currentUser.username ? updatedUser! : u));
            setEditing(null);
        } catch (error: any) {
            console.error("Error updating profile:", error.message, error);
        } finally {
            setLoading(false);
        }
    };


    if (!currentUser) {
        return <LoginView onLogin={handleLogin} />;
    }

    return (
        <>
            {loading && <div style={styles.loadingOverlay}><div style={styles.spinner}></div>Cargando...</div>}
            <header style={styles.header}>
                <h1 style={styles.headerTitle}>Parque recreacional Anyval</h1>
            </header>
            <main style={styles.main}>
                {currentView === 'feed' && <section>{posts.map(post => (<PostCard key={post.id} post={post} currentUser={currentUser} onLike={handleLikePost} onAddComment={handleAddComment} users={users} onEditPost={(id) => setEditing({ type: 'post', id })} onEditComment={(postId, commentId) => setEditing({ type: 'comment', postId, commentId })}/>))}</section>}
                {currentView === 'create' && <CreatePostView onCreatePost={handleCreatePost} onCancel={() => setCurrentView('feed')} />}
                {currentView === 'profile' && <ProfileView currentUser={currentUser} posts={posts} onLogout={() => setCurrentUser(null)} onEditProfile={() => setEditing({type: 'profile', username: currentUser.username})}/>}
            </main>
            {editing && <EditModal editing={editing} posts={posts} currentUser={currentUser} onCancel={() => setEditing(null)} onSavePost={handleSavePost} onSaveComment={handleSaveComment} onSaveProfile={handleSaveProfile} />}
            <Navbar activeView={currentView} onNavigate={setCurrentView} />
        </>
    );
};

// --- STYLES ---
const styles: { [key: string]: React.CSSProperties } = {
    // Loading
    loadingOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, color: 'var(--primary-color)', fontSize: '1.2rem', flexDirection: 'column', gap: '15px' },
    spinner: {
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid var(--primary-color)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite',
    },
    // Login
    loginContainer: { display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100%', padding: '20px', textAlign: 'center' },
    loginForm: { width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' },
    loginAvatarPreview: { width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px', border: '2px solid var(--primary-color)', boxShadow: 'var(--neon-glow-primary)' },
    loginInput: { width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '6px', border: '1px solid var(--divider-color)', textAlign: 'center', backgroundColor: 'var(--card-background-color)', color: 'var(--primary-text-color)' },
    loginButton: { width: '100%', padding: '12px', border: '1px solid var(--primary-color)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--primary-color)', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', textShadow: 'var(--neon-glow-primary)', transition: 'background-color 0.3s, color 0.3s' },
    loginButtonDisabled: { width: '100%', padding: '12px', border: '1px solid var(--divider-color)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--divider-color)', fontSize: '1rem', fontWeight: 'bold', cursor: 'not-allowed' },
    loginSubtitle: { color: 'var(--secondary-text-color)', maxWidth: '340px', marginBottom: '30px' },
    // Layout
    header: { width: '100%', backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(10px)', padding: '10px 20px', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--divider-color)', textAlign: 'center' },
    headerTitle: { margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary-color)', textShadow: 'var(--neon-glow-primary)' },
    main: { width: '100%', maxWidth: '680px', padding: '20px 20px 80px 20px' },
    // Create Post
    createPostContainer: { backgroundColor: 'var(--card-background-color)', borderRadius: '8px', padding: '12px 16px', border: '1px solid var(--divider-color)', width: '100%', display: 'flex', flexDirection: 'column' },
    createPostHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid var(--divider-color)' },
    createPostTitle: { fontSize: '1.1rem', margin: 0, color: 'var(--primary-text-color)' },
    cancelButton: { background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '1rem', cursor: 'pointer' },
    textarea: { width: '100%', border: 'none', outline: 'none', fontSize: '1.1rem', fontFamily: 'inherit', resize: 'none', backgroundColor: 'transparent', color: 'var(--primary-text-color)', flexGrow: 1, paddingTop: '10px', minHeight: '100px' },
    postButton: { padding: '8px 16px', border: '1px solid var(--primary-color)', borderRadius: '6px', backgroundColor: 'var(--primary-color)', color: '#0a0a0a', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.3s' },
    postButtonDisabled: { padding: '8px 16px', border: '1px solid var(--divider-color)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--divider-color)', fontSize: '1rem', fontWeight: 'bold', cursor: 'not-allowed' },
    categorySelect: { padding: '8px', border: '1px solid var(--divider-color)', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'var(--background-color)', color: 'var(--primary-text-color)' },
    // Post Card
    postCard: { backgroundColor: 'var(--card-background-color)', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--divider-color)', overflow: 'hidden' },
    postHeader: { display: 'flex', alignItems: 'center', marginBottom: '10px', padding: '12px 16px 0 16px' },
    avatar: { fontSize: '2rem', marginRight: '10px', backgroundColor: '#333', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px', objectFit: 'cover', border: '2px solid var(--primary-color)' },
    username: { margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary-text-color)' },
    timestamp: { margin: 0, fontSize: '0.8rem', color: 'var(--secondary-text-color)' },
    categoryTag: { backgroundColor: '#333', color: 'var(--primary-color)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' },
    postContent: { fontSize: '1rem', lineHeight: 1.4, whiteSpace: 'pre-wrap', margin: '0 16px 10px 16px', color: 'var(--primary-text-color)' },
    postStats: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--secondary-text-color)', padding: '10px 16px 5px 16px' },
    postActions: { display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--divider-color)' },
    actionButton: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--secondary-text-color)', fontWeight: '500', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s' },
    actionIcon: { fontSize: '1.25rem' },
    // Comments
    commentsSection: { padding: '8px 16px', backgroundColor: 'rgba(0,0,0,0.2)' },
    comment: { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' },
    commentAvatar: { fontSize: '1.2rem', backgroundColor: '#333', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    commentAvatarImg: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--divider-color)' },
    commentBody: { backgroundColor: '#2c2c2c', borderRadius: '12px', padding: '6px 10px', flexGrow: 1 },
    commentText: { margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--primary-text-color)' },
    commentForm: { display: 'flex', gap: '8px', marginTop: '10px' },
    commentInput: { flexGrow: 1, border: '1px solid var(--divider-color)', borderRadius: '16px', padding: '6px 12px', fontSize: '0.9rem', backgroundColor: 'var(--card-background-color)', color: 'var(--primary-text-color)' },
    commentButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', display: 'flex', alignItems: 'center' },
    // Profile
    profileHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px', backgroundColor: 'var(--card-background-color)', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--divider-color)' },
    profileUsername: { textShadow: 'var(--neon-glow-primary)', color: 'var(--primary-color)' },
    editProfileButton: { padding: '8px 16px', border: '1px solid var(--primary-color)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--primary-color)', cursor: 'pointer', transition: 'background-color 0.3s' },
    logoutButton: { padding: '8px 16px', border: '1px solid var(--secondary-text-color)', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--secondary-text-color)', fontSize: '0.9rem', cursor: 'pointer', transition: 'background-color 0.3s, color 0.3s' },
    // Navbar
    navbar: { position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px', backgroundColor: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--divider-color)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100 },
    navButton: { background: 'none', border: 'none', cursor: 'pointer', flex: 1, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    navIcon: { fontSize: '2rem', transition: 'color 0.3s, text-shadow 0.3s' },
    // Options Menu
    optionsButton: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--icon-color)', marginLeft: 'auto', padding: '4px' },
    optionsMenu: { position: 'absolute', top: '30px', right: 0, backgroundColor: 'var(--card-background-color)', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', zIndex: 110, border: '1px solid var(--divider-color)' },
    optionsMenuItem: { background: 'none', border: 'none', padding: '8px 16px', width: '100%', textAlign: 'left', cursor: 'pointer', color: 'var(--primary-text-color)' },
    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 },
    modalContent: { backgroundColor: 'var(--card-background-color)', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid var(--primary-color)', boxShadow: 'var(--neon-glow-primary)' },
    modalInput: { width: '100%', padding: '10px', fontSize: '1rem', border: '1px solid var(--divider-color)', borderRadius: '6px', backgroundColor: 'var(--background-color)', color: 'var(--primary-text-color)' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
};

// --- RENDER APP ---
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}